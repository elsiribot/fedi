use std::fmt::Display;
use std::mem;
use std::ops::Deref;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::{Arc, OnceLock, RwLock};
use std::time::Duration;

use anyhow::{anyhow, bail, Context, Result};
use bech32::Bech32;
use bitcoin::key::{Keypair, Secp256k1};
use bitcoin::XOnlyPublicKey;
use bridge_inner::federation::{federation_v2, Federations};
use bridge_inner::matrix::multispend::services::MultispendServices;
use bridge_inner::matrix::Matrix;
use communities::Communities;
use device_registration::DeviceRegistrationService;
use either::Either;
use fedi_social_client::{
    self, FediSocialCommonGen, RecoveryFile, SocialRecoveryClient, SocialRecoveryState,
};
use fedimint_api_client::api::DynGlobalApi;
use fedimint_core::config::ClientConfig;
use fedimint_core::core::ModuleKind;
use fedimint_core::db::IDatabaseTransactionOpsCoreTyped as _;
use fedimint_core::encoding::Decodable;
use fedimint_core::module::registry::ModuleDecoderRegistry;
use fedimint_core::module::CommonModuleInit;
use fedimint_core::PeerId;
use fedimint_derive_secret::{ChildId, DerivableSecret};
use fedimint_mint_client::OOBNotes;
use futures::StreamExt as _;
use nostr::nips::nip44;
use nostr::secp256k1::Message;
use rpc_types::error::ErrorCode;
use rpc_types::event::SocialRecoveryEvent;
use rpc_types::{
    RpcAmount, RpcDeviceIndexAssignmentStatus, RpcEcashInfo, RpcFederation, RpcFederationId,
    RpcNostrPubkey, RpcNostrSecret, RpcPeerId, RpcPublicKey, RpcRecoveryId, RpcRegisteredDevice,
    RpcSignedLnurlMessage, SocialRecoveryApproval, SocialRecoveryQr,
};
use runtime::api::IFediApi;
use runtime::bridge_runtime::Runtime;
use runtime::constants::{LNURL_CHILD_ID, MATRIX_CHILD_ID, NOSTR_CHILD_ID};
use runtime::db::FederationPendingRejoinFromScratchKeyPrefix;
use runtime::event::EventSink;
use runtime::features::FeatureCatalog;
use runtime::storage::{
    AppState, AppStateUncommittedSeed, DeviceIdentifier, FiatFXInfo, ModuleFediFeeSchedule, Storage,
};
use runtime::utils::required_threashold_of;
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, OnceCell};
use tracing::debug;
use ts_rs::TS;

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

/// This struct encapulsates the feature services of the Bridge like Federations
/// or Communities etc.
pub struct BridgeFull {
    pub runtime: Arc<Runtime>,
    pub federations: Arc<Federations>,
    pub communities: Arc<Communities>,
    pub matrix: OnceCell<Arc<Matrix>>,
    pub multispend_services: Arc<MultispendServices>,
    pub device_registration_service: Mutex<DeviceRegistrationService>,
}

#[derive(Debug)]
pub enum BridgeFullInitError {
    V2IdentifierMismatch {
        existing: DeviceIdentifier,
        new: DeviceIdentifier,
    },
    Other(anyhow::Error),
}

impl Display for BridgeFullInitError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let message =
            match self {
                Self::V2IdentifierMismatch { existing, new } => format!("Expected device ID {} but received {}. Likely app has been cloned on a new device.", existing, new),
                Self::Other(e) => e.to_string(),
            };
        write!(f, "{message}")
    }
}

impl BridgeFull {
    pub async fn new(
        runtime: Arc<Runtime>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<Self, BridgeFullInitError> {
        // If the provided v2 identifier is not the same as the existing v2 identifier,
        // then under the guarantees of the v2 identifier, the user's phone
        // storage has been cloned (as part of a new device set up process,
        // perhaps). In this case, we notify the caller with a special type of error.
        let existing_identifier_v2 = runtime.app_state.device_identifier().await;
        if existing_identifier_v2 != device_identifier {
            return Err(BridgeFullInitError::V2IdentifierMismatch {
                existing: existing_identifier_v2,
                new: device_identifier,
            });
        }

        let device_registration_service =
            Mutex::new(DeviceRegistrationService::new(runtime.clone()).await);

        let multispend_services = MultispendServices::new(runtime.clone());

        // Load communities and federations services
        let communities = Communities::init(runtime.clone()).await;
        let federations = Arc::new(Federations::new(
            runtime.clone(),
            multispend_services.clone(),
        ));
        federations.load_joined_federations_in_background().await;

        Ok(Self {
            runtime,
            federations,
            communities,
            matrix: Default::default(),
            device_registration_service,
            multispend_services,
        })
    }

    pub fn start_multispend_services(&self, matrix: Arc<Matrix>) {
        let runtime = self.runtime.clone();
        let federations = self.federations.clone();
        let multispend_services = self.multispend_services.clone();
        self.runtime
            .task_group
            .spawn_cancellable("multispend::WithdrawalService", async move {
                multispend_services
                    .withdrawal
                    .run_continuously(&runtime.multispend_db(), &federations)
                    .await
            });
        let multispend_services = self.multispend_services.clone();
        self.runtime.task_group.spawn_cancellable(
            "multispend::CompletionNotificationService",
            async move {
                multispend_services
                    .completion_notification
                    .run_continuously(&matrix)
                    .await
            },
        );
    }

    /// Dump the database for a given federation.
    pub async fn dump_db(&self, federation_id: &str) -> anyhow::Result<PathBuf> {
        let db_dump_path = format!("db-{federation_id}.dump");
        let federation = self.federations.get_federation(federation_id)?;
        let db = federation.client.db().clone();
        let mut buffer = Vec::new();
        bug_report::db_dump::dump_db(&db, &mut buffer).await?;
        self.runtime
            .storage
            .write_file(db_dump_path.as_ref(), buffer)
            .await?;
        Ok(self.runtime.storage.platform_path(db_dump_path.as_ref()))
    }

    pub async fn validate_ecash(&self, ecash: String) -> Result<RpcEcashInfo> {
        let oob = OOBNotes::from_str(&ecash)?;
        let id = self
            .federations
            .find_federation_id_for_prefix(oob.federation_id_prefix());
        match id {
            Some(id) => Ok(RpcEcashInfo::Joined {
                federation_id: RpcFederationId(id),
                amount: RpcAmount(oob.total_amount()),
            }),
            None => Ok(RpcEcashInfo::NotJoined {
                federation_invite: oob.federation_invite().map(|invite| invite.to_string()),
                amount: RpcAmount(oob.total_amount()),
            }),
        }
    }

    // FIXME: doesn't need result
    async fn get_social_recovery_state(&self) -> anyhow::Result<Option<SocialRecoveryState>> {
        Ok(self
            .runtime
            .app_state
            .with_read_lock(|state| state.social_recovery_state.clone())
            .await)
    }

    async fn set_social_recovery_state(
        &self,
        social_recovery_state: Option<SocialRecoveryState>,
    ) -> anyhow::Result<()> {
        self.runtime
            .app_state
            .with_write_lock(|state| {
                state.social_recovery_state = social_recovery_state;
            })
            .await
    }

    pub async fn fetch_registered_devices(&self) -> anyhow::Result<Vec<RpcRegisteredDevice>> {
        let mnemonic = self.runtime.app_state.root_mnemonic().await;
        let registered_devices_fut = device_registration::get_registered_devices_with_backoff(
            self.runtime.fedi_api.clone(),
            mnemonic,
        );
        let registered_devices =
            fedimint_core::task::timeout(Duration::from_secs(120), registered_devices_fut)
                .await
                .context("fetching registered devices timed out")??
                .into_iter()
                .map(Into::into)
                .collect();
        Ok(registered_devices)
    }

    pub async fn register_device_with_index(
        &self,
        index: u8,
        force_overwrite: bool,
    ) -> anyhow::Result<Option<RpcFederation>> {
        let register_device_fut = device_registration::register_device_with_backoff(
            self.runtime.app_state.clone(),
            self.runtime.fedi_api.clone(),
            self.runtime.event_sink.clone(),
            index,
            force_overwrite,
        );
        fedimint_core::task::timeout(Duration::from_secs(120), register_device_fut)
            .await
            .context("registering device timed out")??;

        self.runtime.app_state.set_device_index(index).await?;
        self.device_registration_service
            .lock()
            .await
            .start_ongoing_periodic_registration(
                index,
                &self.runtime.task_group,
                self.runtime.event_sink.clone(),
            )
            .await?;

        if self
            .runtime
            .app_state
            .with_read_lock(|state| state.social_recovery_state.clone())
            .await
            .is_some()
        {
            let recovery_client = self.social_recovery_client_continue().await?;

            self.set_social_recovery_state(None).await?;
            tracing::info!("social recovery complete");
            tracing::info!("auto joining federation");
            let fed_arc = self
                .federations
                .join_federation(
                    federation_v2::invite_code_from_client_confing(
                        &ClientConfig::consensus_decode_hex(
                            &recovery_client.state().client_config,
                            &Default::default(),
                        )?,
                    )
                    .to_string(),
                    false,
                )
                .await?;
            Ok(Some(fed_arc.to_rpc_federation().await))
        } else {
            Ok(None)
        }
    }

    pub async fn upload_backup_file(
        &self,
        federation_id: RpcFederationId,
        video_file_path: PathBuf,
    ) -> Result<PathBuf> {
        let federation = self.federations.get_federation(&federation_id.0)?;
        let storage = self.runtime.storage.clone();
        // if remote bridge, copy with adb? maybe storage trait could do this?
        let video_file = storage
            .read_file(&video_file_path)
            .await?
            .ok_or(anyhow!("video file not found"))?;
        let root_mnemonic = self.runtime.app_state.root_mnemonic().await;
        let recovery_file = federation
            .upload_backup_file(video_file, root_mnemonic)
            .await?;
        storage
            .write_file(RECOVERY_FILENAME.as_ref(), recovery_file)
            .await?;
        Ok(storage.platform_path(RECOVERY_FILENAME.as_ref()))
    }

    pub async fn start_social_recovery_v2(
        &self,
        recovery_file: RecoveryFile,
    ) -> anyhow::Result<()> {
        let social_instance_id = *recovery_file
            .client_config
            .modules
            .iter()
            .find(|(_, module_config)| module_config.is_kind(&fedi_social_client::KIND))
            .context("social module not available in recovery config")?
            .0;
        let decoders = ModuleDecoderRegistry::from_iter(vec![(
            social_instance_id,
            fedi_social_client::KIND,
            FediSocialCommonGen::decoder(),
        )]);
        let config = recovery_file
            .client_config
            .clone()
            .redecode_raw(&decoders)?;
        let (social_module_id, social_cfg) = config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");

        let social_api = DynGlobalApi::from_endpoints(
            config
                .global
                .api_endpoints
                .iter()
                .map(|(peer_id, peer_url)| (*peer_id, peer_url.url.clone())),
            &None, // FIXME: api secret
        )
        .await?
        .with_module(social_module_id);
        let client = SocialRecoveryClient::new_start(
            social_module_id,
            social_cfg.clone(),
            social_api,
            recovery_file.clone(),
        )?;

        // request social recovery verification with the federation
        let verification_request =
            client.create_verification_request(recovery_file.verification_document.clone())?;
        client
            .upload_verification_request(&verification_request)
            .await
            .context("upload verification request")?;

        self.set_social_recovery_state(Some(client.state().clone()))
            .await?;
        Ok(())
    }

    pub async fn recovery_qr(&self) -> anyhow::Result<Option<SocialRecoveryQr>> {
        if let Some(state) = self.get_social_recovery_state().await? {
            Ok(Some(SocialRecoveryQr {
                recovery_id: RpcRecoveryId(state.recovery_id()),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn cancel_social_recovery(&self) -> anyhow::Result<()> {
        self.set_social_recovery_state(None).await?;
        Ok(())
    }

    // TODO: rename this to start_social_recovery
    pub async fn validate_recovery_file(&self, recovery_file_path: PathBuf) -> Result<()> {
        // Only allow recovery when there are no joined federations
        if !self.federations.get_federations_map().is_empty() {
            bail!("Cannot recover while joined federations exist");
        }

        // These 2 lines validate
        let recovery_file_bytes = self
            .runtime
            .storage
            .read_file(&recovery_file_path)
            .await?
            .ok_or(anyhow!("recovery file not found"))?;
        let recovery_file = RecoveryFile::from_bytes(&recovery_file_bytes)
            .context(ErrorCode::InvalidSocialRecoveryFile)?;

        // this starts a social recovery "session" ... what this means is kinda
        // handwavvy
        self.start_social_recovery_v2(recovery_file).await?;
        Ok(())
    }

    pub async fn complete_social_recovery(&self) -> Result<Vec<RpcRegisteredDevice>> {
        todo!()
    }

    async fn social_recovery_client_continue(&self) -> anyhow::Result<SocialRecoveryClient> {
        let social_state = self
            .get_social_recovery_state()
            .await?
            .context(ErrorCode::BadRequest)?;
        let config: ClientConfig =
            ClientConfig::consensus_decode_hex(&social_state.client_config, &Default::default())?;
        let social_instance_id = *config
            .modules
            .iter()
            .find(|(_, module_config)| module_config.is_kind(&fedi_social_client::KIND))
            .context("social module not available in recovery config")?
            .0;
        let decoders = ModuleDecoderRegistry::from_iter(vec![(
            social_instance_id,
            fedi_social_client::KIND,
            FediSocialCommonGen::decoder(),
        )]);
        let config = config.redecode_raw(&decoders)?;
        let (social_module_id, social_cfg) = config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        let social_api = DynGlobalApi::from_endpoints(
            config
                .global
                .api_endpoints
                .iter()
                .map(|(peer_id, peer_url)| (*peer_id, peer_url.url.clone())),
            &None, // FIXME: api secret
        )
        .await?
        .with_module(social_module_id);
        let recovery_client = SocialRecoveryClient::new_continue(
            social_module_id,
            social_cfg.clone(),
            social_api,
            social_state.clone(),
        );
        Ok(recovery_client)
    }

    pub async fn social_recovery_approvals(&self) -> Result<SocialRecoveryEvent> {
        let mut recovery_client = self.social_recovery_client_continue().await?;

        let client_config = ClientConfig::consensus_decode_hex(
            &recovery_client.state().client_config,
            &ModuleDecoderRegistry::from_iter(vec![]),
        )?;
        let guardian_peer_ids: Vec<(String, PeerId)> = client_config
            .global
            .api_endpoints
            .into_iter()
            .map(|(peer_id, endpoint)| (endpoint.name, peer_id))
            .collect();
        let mut approvals = vec![];
        for (guardian_name, peer_id) in guardian_peer_ids {
            let approved = recovery_client
                .get_decryption_share_from(peer_id)
                .await
                .unwrap_or_else(|_| {
                    debug!("failed to get decryption share from peer {}", peer_id);
                    false
                });
            approvals.push(SocialRecoveryApproval {
                guardian_name,
                approved,
            });
        }

        // calculate approvals remaining
        let approvals_required = required_threashold_of(approvals.len());
        let num_approvals = approvals.iter().filter(|a| a.approved).count();
        let remaining = approvals_required.saturating_sub(num_approvals);

        // Save progress to DB
        self.set_social_recovery_state(Some(recovery_client.state().clone()))
            .await?;
        let result = SocialRecoveryEvent {
            approvals,
            remaining,
        };
        Ok(result)
    }

    pub async fn download_verification_doc(
        &self,
        federation_id: RpcFederationId,
        recovery_id: RpcRecoveryId,
        peer_id: RpcPeerId,
    ) -> Result<Option<PathBuf>> {
        let federation = self.federations.get_federation(&federation_id.0)?;
        let verification_doc = federation
            .download_verification_doc(&recovery_id.0, peer_id.0)
            .await?;
        if let Some(verification_doc) = verification_doc {
            self.runtime
                .storage
                .write_file(VERIFICATION_FILENAME.as_ref(), verification_doc)
                .await?;
            tracing::info!("saved verificaiton doc");
            Ok(Some(
                self.runtime
                    .storage
                    .platform_path(VERIFICATION_FILENAME.as_ref()),
            ))
        } else {
            Ok(None)
        }
    }

    pub async fn approve_social_recovery_request(
        &self,
        federation_id: RpcFederationId,
        recovery_id: RpcRecoveryId,
        peer_id: RpcPeerId,
        password: String,
    ) -> Result<()> {
        let federation = self.federations.get_federation(&federation_id.0)?;
        federation
            .approve_social_recovery_request(&recovery_id.0, peer_id.0, &password)
            .await
    }

    pub async fn set_module_fedi_fee_schedule(
        &self,
        federation_id: RpcFederationId,
        module_kind: ModuleKind,
        send_ppm: u64,
        receive_ppm: u64,
    ) -> Result<()> {
        self.federations
            .fedi_fee_helper
            .set_module_fee_schedule(
                federation_id.0,
                module_kind,
                ModuleFediFeeSchedule {
                    send_ppm,
                    receive_ppm,
                },
            )
            .await
    }
    pub fn on_app_foreground(&self) {
        self.communities.refresh_metas_in_background();
    }
}

/// This is instantiated once as a global. When RPC commands come in, this
/// struct is used as a router to look up the federation and handle the RPC
/// command using it.
pub struct Bridge {
    // the read lock is only held for very small time
    // write lock is held during commitToSeed.
    state: RwLock<BridgeState>,
    // after runtime is ready it is saved in OnceLock to avoid holding lock to get reference to it.
    runtime: OnceLock<Arc<Runtime>>,
    // after bridge full is ready it is saved in OnceLock to avoid holding lock to get reference to
    // it.
    full: OnceLock<Arc<BridgeFull>>,
}

// allow transitions:
// start -> RuntimeOnly
// start -> Uncommited
// start -> Full
// Uncommited -> RuntimeOnly
// Uncommited -> Full
enum BridgeState {
    /// Bridge is not always guaranteed to exist as "Full", for
    /// example if the device index has been taken over by another device.
    /// There may also be other scenarios for these services to not be
    /// available. In such scenarios only the Runtime is available.
    RuntimeOnly {
        runtime: Arc<Runtime>,
        error: BridgeFullInitError,
    },
    /// Bridge has not been committed to a seed yet, and seed can be changed
    /// using restoreMnemonic
    ///
    /// This can transition into full or runtime only after commiting to a seed.
    Uncommitted {
        state: AppStateUncommittedSeed,
        fedi_api: Arc<dyn IFediApi>,
        // saved for transitioning into full
        storage: Storage,
        event_sink: EventSink,
        feature_catalog: Arc<FeatureCatalog>,
        device_identifier: DeviceIdentifier,
    },
    /// No errors during startup and we have a committed seed, this bridge is
    /// full.
    Full(Arc<BridgeFull>),
    /// A dead state that is never held.
    Null,
}

impl Bridge {
    pub async fn new(
        storage: Storage,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
        feature_catalog: Arc<FeatureCatalog>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<Self> {
        let state = match AppState::load(storage.clone(), device_identifier.clone())
            .await
            .context("failed to load state")?
        {
            Either::Left(state) => {
                Self::try_load_bridge_full(
                    storage,
                    event_sink,
                    fedi_api,
                    state,
                    feature_catalog,
                    device_identifier,
                )
                .await?
            }
            Either::Right(state) => BridgeState::Uncommitted {
                state,
                fedi_api,
                feature_catalog,
                event_sink,
                storage,
                device_identifier,
            },
        };
        Ok(Self {
            state: RwLock::new(state),
            runtime: OnceLock::default(),
            full: OnceLock::default(),
        })
    }

    async fn try_load_bridge_full(
        storage: Storage,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
        app_state: AppState,
        feature_catalog: Arc<FeatureCatalog>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<BridgeState> {
        let runtime = Runtime::new(storage, event_sink, fedi_api, app_state, feature_catalog)
            .await
            .context("Failed to create runtime for bridge")?;
        let runtime = Arc::new(runtime);
        match BridgeFull::new(runtime.clone(), device_identifier).await {
            Ok(full) => Ok(BridgeState::Full(Arc::new(full))),
            Err(error) => Ok(BridgeState::RuntimeOnly { runtime, error }),
        }
    }

    pub fn is_commited(&self) -> bool {
        !matches!(
            &*self.state.read().expect("poison"),
            BridgeState::Uncommitted { .. }
        )
    }

    pub fn runtime(&self) -> anyhow::Result<&Arc<Runtime>> {
        // no try_get_or_init in OnceLock
        if let Some(runtime) = self.runtime.get() {
            return Ok(runtime);
        }
        let runtime = match &*self.state.read().expect("poison") {
            BridgeState::RuntimeOnly { runtime, error: _ } => runtime.clone(),
            BridgeState::Full(bridge_full) => bridge_full.runtime.clone(),
            BridgeState::Uncommitted { .. } => bail!("commit the seed first"),
            BridgeState::Null => bail!("null state must not be visible outside"),
        };
        // racy, but fine because all thread will try to set the same value. so doesn't
        // matter which one wins
        Ok(self.runtime.get_or_init(|| runtime))
    }

    pub fn full(&self) -> anyhow::Result<&Arc<BridgeFull>> {
        if let Some(full) = self.full.get() {
            return Ok(full);
        }
        let full = match &*self.state.read().expect("poison") {
            BridgeState::RuntimeOnly { runtime: _, error } => bail!(error.to_string()),
            BridgeState::Full(bridge_full) => bridge_full.clone(),
            BridgeState::Uncommitted { .. } => bail!("commit the seed first"),
            BridgeState::Null => bail!("null state must not be visible outside"),
        };
        Ok(self.full.get_or_init(|| full))
    }

    pub fn on_app_foreground(&self) {
        if let Ok(full) = self.full() {
            full.on_app_foreground();
        }
    }

    pub async fn bridge_status(&self) -> anyhow::Result<RpcBridgeStatus> {
        let (runtime, bridge_full_init_error) = match &*self.state.read().expect("poison") {
            BridgeState::Uncommitted { .. } => return Ok(RpcBridgeStatus::SeedUncommitted {}),
            BridgeState::Null => bail!("null state must not be visible outside"),
            BridgeState::RuntimeOnly { error, runtime } => (runtime.clone(), Some(error.into())),
            BridgeState::Full(full) => (full.runtime.clone(), None),
        };
        let matrix_setup = runtime
            .app_state
            // did we ever setup matrix?
            .with_read_lock(|x| {
                #[allow(deprecated)]
                let value = x.matrix_session.is_some() || x.matrix_session_native_sync.is_some();
                value
            })
            .await;
        let device_index_assignment_status = runtime.device_index_assignment_status().await?;
        Ok(RpcBridgeStatus::SeedCommitted {
            matrix_setup,
            device_index_assignment_status,
            bridge_full_init_error,
        })
    }

    /// commit to a random seed or the given seed
    pub async fn commit_to_seed(&self, mnemonic: Option<bip39::Mnemonic>) -> Result<()> {
        // steal the bridge state
        let bridge_state = {
            let mut wlock = self.state.write().expect("poison");
            mem::replace(&mut *wlock, BridgeState::Null)
        };
        let new_bridge_state = match bridge_state {
            BridgeState::Uncommitted {
                state,
                event_sink,
                storage,
                fedi_api,
                feature_catalog,
                device_identifier,
            } => {
                if let Some(mnemonic) = mnemonic {
                    state.restore_mnemonic(mnemonic).await?;
                }
                let app_state = state.commit_to_seed().await;
                Self::try_load_bridge_full(
                    storage,
                    event_sink,
                    fedi_api,
                    app_state,
                    feature_catalog,
                    device_identifier,
                )
                .await?
            }
            _ => {
                panic!("invalid call to commit_to_seed when already committed to seed");
            }
        };

        *self.state.write().expect("poison") = new_bridge_state;
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export)]
pub enum RpcBridgeStatus {
    SeedCommitted {
        matrix_setup: bool,

        device_index_assignment_status: RpcDeviceIndexAssignmentStatus,
        bridge_full_init_error: Option<RpcBridgeFullInitError>,
    },
    SeedUncommitted {},
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export)]
pub enum RpcBridgeFullInitError {
    V2IdentifierMismatch { existing: String, new: String },
    Other(String),
}

impl From<&BridgeFullInitError> for RpcBridgeFullInitError {
    fn from(error: &BridgeFullInitError) -> Self {
        match error {
            BridgeFullInitError::V2IdentifierMismatch { existing, new } => {
                RpcBridgeFullInitError::V2IdentifierMismatch {
                    existing: existing.to_string(),
                    new: new.to_string(),
                }
            }
            BridgeFullInitError::Other(error) => RpcBridgeFullInitError::Other(error.to_string()),
        }
    }
}

#[allow(async_fn_in_trait)]
pub trait RuntimeExt: Deref<Target = Runtime> {
    async fn device_index_assignment_status(
        &self,
    ) -> anyhow::Result<RpcDeviceIndexAssignmentStatus> {
        Ok(match self.app_state.ensure_device_index().await {
            Ok(index) => RpcDeviceIndexAssignmentStatus::Assigned(index),
            Err(_) => RpcDeviceIndexAssignmentStatus::Unassigned,
        })
    }

    async fn get_mnemonic_words(&self) -> anyhow::Result<Vec<String>> {
        Ok(self
            .app_state
            .root_mnemonic()
            .await
            .words()
            .map(|x| x.to_owned())
            .collect())
    }

    async fn update_cached_fiat_fx_info(&self, info: FiatFXInfo) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|state| state.cached_fiat_fx_info = Some(info))
            .await
    }

    /// Enable logging of potentially sensitive information.
    async fn sensitive_log(&self) -> bool {
        self.app_state
            .with_read_lock(|f| f.sensitive_log.unwrap_or(false))
            .await
    }

    async fn set_sensitive_log(&self, enable: bool) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|f| {
                f.sensitive_log = Some(enable);
            })
            .await?;
        Ok(())
    }

    async fn sign_lnurl_message(
        &self,
        message: Message,
        domain: String,
    ) -> Result<RpcSignedLnurlMessage> {
        let secp = Secp256k1::new();
        let lnurl_secret = self
            .app_state
            .root_secret()
            .await
            .child_key(ChildId(LNURL_CHILD_ID));
        let lnurl_secret_bytes: [u8; 32] = lnurl_secret.to_random_bytes();
        let lnurl_domain_secret = DerivableSecret::new_root(&lnurl_secret_bytes, domain.as_bytes());
        let lnurl_domain_keypair = lnurl_domain_secret.to_secp_key(&secp);
        let lnurl_domain_pubkey = lnurl_domain_keypair.public_key();
        let signature = secp.sign_ecdsa(&message, &lnurl_domain_keypair.secret_key());
        Ok(RpcSignedLnurlMessage {
            signature,
            pubkey: RpcPublicKey(lnurl_domain_pubkey),
        })
    }

    async fn get_nostr_pubkey(&self) -> Result<RpcNostrPubkey> {
        let nostr_pubkey = self.nostr_pubkey().await;
        let hrp = bech32::Hrp::parse_unchecked("npub");
        Ok(RpcNostrPubkey {
            npub: bech32::encode::<Bech32>(hrp, &nostr_pubkey.serialize())?,
            hex: nostr_pubkey.to_string(),
        })
    }

    async fn nostr_pubkey(&self) -> XOnlyPublicKey {
        let global_root_secret = self.app_state.root_secret().await;
        let secp = Secp256k1::new();
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);

        nostr_keypair.x_only_public_key().0
    }

    async fn get_nostr_secret(&self) -> Result<RpcNostrSecret> {
        let secp = Secp256k1::new();
        let bytes = self.nostr_secret_key(&secp).await?.secret_bytes();
        let hrp = bech32::Hrp::parse_unchecked("nsec");
        let nsec = bech32::encode::<Bech32>(hrp, &bytes)?;
        let hex = hex::encode(bytes);

        Ok(RpcNostrSecret { hex, nsec })
    }

    async fn nostr_secret_key<Ctx: bitcoin::secp256k1::Context + bitcoin::secp256k1::Signing>(
        &self,
        secp: &Secp256k1<Ctx>,
    ) -> anyhow::Result<Keypair> {
        let global_root_secret = self.app_state.root_secret().await;
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(secp);

        Ok(nostr_keypair)
    }

    async fn sign_nostr_event(&self, event_hash: String) -> Result<String> {
        let global_root_secret = self.app_state.root_secret().await;
        let secp = Secp256k1::new();
        let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let data = &hex::decode(event_hash)?;
        let message = Message::from_digest_slice(data)?;
        let sig = secp.sign_schnorr(&message, &nostr_keypair);
        // Return hex-encoded string
        Ok(format!("{}", sig))
    }

    async fn get_matrix_secret(&self) -> DerivableSecret {
        let global_root_secret = self.app_state.root_secret().await;
        global_root_secret.child_key(ChildId(MATRIX_CHILD_ID))
    }

    async fn get_matrix_media_file(&self, path: PathBuf) -> Result<Vec<u8>> {
        let media_file = self
            .storage
            .read_file(&path)
            .await?
            .ok_or(anyhow!("media file not found"))?;
        Ok(media_file)
    }

    async fn list_federations_pending_rejoin_from_scratch(&self) -> Vec<String> {
        self.bridge_db()
            .begin_transaction_nc()
            .await
            .find_by_prefix(&FederationPendingRejoinFromScratchKeyPrefix)
            .await
            .map(|(key, _)| key.invite_code_str)
            .collect::<Vec<_>>()
            .await
    }

    /// Given a recipient's pubkey and plaintext content, encrypts and returns
    /// the ciphertext as per NIP44.
    async fn nip44_encrypt(&self, pubkey: String, plaintext: String) -> Result<String> {
        let secp = Secp256k1::new();
        let secret_key = self.nostr_secret_key(&secp).await?.secret_key();
        Ok(nip44::encrypt(
            &nostr::SecretKey::from(secret_key),
            &nostr::PublicKey::parse(&pubkey)?,
            plaintext,
            nip44::Version::V2,
        )?)
    }

    /// Given a recipient's pubkey and ciphertext content, decrypts and returns
    /// the plaintext as per NIP44.
    async fn nip44_decrypt(&self, pubkey: String, ciphertext: String) -> Result<String> {
        let secp = Secp256k1::new();
        let secret_key = self.nostr_secret_key(&secp).await?.secret_key();
        Ok(nip44::decrypt(
            &nostr::SecretKey::from(secret_key),
            &nostr::PublicKey::parse(&pubkey)?,
            ciphertext,
        )?)
    }
}

impl RuntimeExt for Arc<Runtime> {}
