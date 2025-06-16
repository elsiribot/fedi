use std::fmt::Display;
use std::ops::Deref;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::{Arc, Mutex as StdMutex, OnceLock};

use anyhow::{anyhow, bail, Context, Result};
use bitcoin::key::Secp256k1;
use bridge_inner::federation::Federations;
use bridge_inner::matrix::bg_matrix::BgMatrix;
use bridge_inner::multispend::services::MultispendServices;
use communities::Communities;
use device_registration::DeviceRegistrationService;
use either::Either;
use fedimint_core::core::ModuleKind;
use fedimint_core::db::{Database, IDatabaseTransactionOpsCoreTyped as _};
use fedimint_derive_secret::{ChildId, DerivableSecret};
use fedimint_mint_client::OOBNotes;
use futures::StreamExt as _;
use nostr::secp256k1::Message;
use nostril::Nostril;
use onboarding::{BridgeOnboarding, RpcOnboardingStage};
use rpc_types::{
    RpcAmount, RpcEcashInfo, RpcFederationId, RpcPeerId, RpcPublicKey, RpcRecoveryId,
    RpcSignedLnurlMessage,
};
use runtime::api::IFediApi;
use runtime::bridge_runtime::Runtime;
use runtime::constants::{LNURL_CHILD_ID, MATRIX_CHILD_ID};
use runtime::db::FederationPendingRejoinFromScratchKeyPrefix;
use runtime::event::EventSink;
use runtime::features::FeatureCatalog;
use runtime::storage::state::{DeviceIdentifier, FiatFXInfo, ModuleFediFeeSchedule};
use runtime::storage::{AppState, OnboardingCompletionMethod, Storage};
use runtime::utils::PoisonedLockExt;
use serde::Serialize;
use tokio::sync::Mutex;
use tracing::error;
use ts_rs::TS;

pub mod onboarding;

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

/// This struct encapulsates the feature services of the Bridge like Federations
/// or Communities etc.
pub struct BridgeFull {
    pub runtime: Arc<Runtime>,
    pub federations: Arc<Federations>,
    pub communities: Arc<Communities>,
    pub matrix: Arc<BgMatrix>,
    pub multispend_services: Arc<MultispendServices>,
    pub device_registration_service: Mutex<DeviceRegistrationService>,
    pub nostril: Nostril,
}

#[derive(Debug, TS, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export)]
pub enum BridgeOffboardingReason {
    DeviceIdentifierMismatch {
        #[serde(skip)]
        existing: DeviceIdentifier,
        #[serde(skip)]
        new: DeviceIdentifier,
    },
}

impl Display for BridgeOffboardingReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::DeviceIdentifierMismatch { existing, new } => write!(f, "Expected device ID {} but received {}. Likely app has been cloned on a new device.", existing, new),
        }
    }
}

impl BridgeFull {
    pub async fn new(
        runtime: Arc<Runtime>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<Self, BridgeOffboardingReason> {
        // If the provided v2 identifier is not the same as the existing v2 identifier,
        // then under the guarantees of the v2 identifier, the user's phone
        // storage has been cloned (as part of a new device set up process,
        // perhaps). In this case, we notify the caller with a special type of error.
        let existing_identifier_v2 = runtime.app_state.device_identifier().await;
        if existing_identifier_v2 != device_identifier {
            error!(%existing_identifier_v2, %device_identifier, "device id mismatch");
            return Err(BridgeOffboardingReason::DeviceIdentifierMismatch {
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

        let nostril = Nostril::new(&runtime).await;
        let nostr_pubkey = nostril.get_pub_key().await.unwrap().npub;

        let matrix = BgMatrix::new(runtime.clone(), nostr_pubkey, multispend_services.clone());

        let bridge = Self {
            runtime,
            federations,
            communities,
            matrix,
            device_registration_service,
            multispend_services,
            nostril,
        };

        bridge.start_bg().await;

        Ok(bridge)
    }

    pub async fn start_bg(&self) {
        let matrix = self.matrix.clone();
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
                    .run_continuously(matrix.wait_multispend().await)
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
    state: StdMutex<BridgeState>,
    // after runtime is ready it is saved in OnceLock to avoid holding lock to get reference to it.
    runtime: OnceLock<Arc<Runtime>>,
    // after bridge full is ready it is saved in OnceLock to avoid holding lock to get reference to
    // it.
    full: OnceLock<Arc<BridgeFull>>,
}

// allow transitions:
// start -> Offboarding
// start -> Uncommited
// start -> Full
// Onboarding -> Offboarding
// Onboarding -> Full
#[derive(Clone)]
pub enum BridgeState {
    /// This bridge is no longer usable, we want users to uninstall the app.
    /// example: Device Id mismatches.
    Offboarding {
        runtime: Arc<Runtime>,
        reason: Arc<BridgeOffboardingReason>,
    },
    /// Bridge is still onboarding.
    /// This can transition into full or runtime only.
    Onboarding(Arc<BridgeOnboarding>),
    /// No errors during startup and we have a committed seed, this bridge is
    /// full.
    Full(Arc<BridgeFull>),
}

impl Bridge {
    pub async fn new(
        storage: Storage,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
        feature_catalog: Arc<FeatureCatalog>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<Self> {
        let global_db = storage.federation_database_v2("global").await?;
        let state = match AppState::load(&storage, &global_db, device_identifier.clone())
            .await
            .context("failed to load state")?
        {
            Either::Left(state) => {
                Self::try_load_bridge_full(
                    storage,
                    global_db,
                    event_sink,
                    fedi_api,
                    state,
                    feature_catalog,
                    device_identifier,
                )
                .await?
            }
            Either::Right(state) => BridgeState::Onboarding(Arc::new(BridgeOnboarding::new(
                state,
                fedi_api,
                storage,
                global_db,
                event_sink,
                feature_catalog,
                device_identifier,
            ))),
        };
        Ok(Self {
            state: StdMutex::new(state),
            runtime: OnceLock::default(),
            full: OnceLock::default(),
        })
    }

    pub fn state(&self) -> BridgeState {
        self.state.ensure_lock().clone()
    }

    fn set_state(&self, bridge_state: BridgeState) {
        *self.state.ensure_lock() = bridge_state;
    }

    async fn try_load_bridge_full(
        storage: Storage,
        global_db: Database,
        event_sink: EventSink,
        fedi_api: Arc<dyn IFediApi>,
        app_state: AppState,
        feature_catalog: Arc<FeatureCatalog>,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<BridgeState> {
        let runtime = Runtime::new(
            storage,
            global_db,
            event_sink,
            fedi_api,
            app_state,
            feature_catalog,
        )
        .await
        .context("Failed to create runtime for bridge")?;
        let runtime = Arc::new(runtime);
        match BridgeFull::new(runtime.clone(), device_identifier).await {
            Ok(full) => Ok(BridgeState::Full(Arc::new(full))),
            Err(reason) => Ok(BridgeState::Offboarding {
                runtime,
                reason: Arc::new(reason),
            }),
        }
    }

    pub fn runtime(&self) -> anyhow::Result<&Arc<Runtime>> {
        // no try_get_or_init in OnceLock
        if let Some(runtime) = self.runtime.get() {
            return Ok(runtime);
        }
        let runtime = match self.state() {
            BridgeState::Offboarding { runtime, .. } => runtime.clone(),
            BridgeState::Full(bridge_full) => bridge_full.runtime.clone(),
            BridgeState::Onboarding { .. } => bail!("frontend bug: complete onboarding first"),
        };
        // racy, but fine because all thread will try to set the same value. so doesn't
        // matter which one wins
        Ok(self.runtime.get_or_init(|| runtime))
    }

    pub fn full(&self) -> anyhow::Result<&Arc<BridgeFull>> {
        if let Some(full) = self.full.get() {
            return Ok(full);
        }
        let full = match self.state() {
            BridgeState::Offboarding { reason, .. } => {
                bail!("frontend bug: bridge is offboarding: {reason}")
            }
            BridgeState::Full(bridge_full) => bridge_full.clone(),
            BridgeState::Onboarding { .. } => bail!("frontend bug: complete onboarding first"),
        };
        Ok(self.full.get_or_init(|| full))
    }

    pub fn on_app_foreground(&self) {
        if let Ok(full) = self.full() {
            full.on_app_foreground();
        }
    }

    pub async fn bridge_status(&self) -> anyhow::Result<RpcBridgeStatus> {
        match self.state() {
            BridgeState::Onboarding(onboarding) => Ok(RpcBridgeStatus::Onboarding {
                stage: onboarding.stage().await?,
            }),
            BridgeState::Offboarding { reason, .. } => Ok(RpcBridgeStatus::Offboarding {
                reason: reason.clone(),
            }),
            BridgeState::Full(_) => Ok(RpcBridgeStatus::Onboarded {}),
        }
    }

    pub async fn complete_onboarding(&self, method: OnboardingCompletionMethod) -> Result<()> {
        let new_bridge_state = match self.state() {
            BridgeState::Onboarding(onboarding) => onboarding.complete_onboarding(method).await?,
            _ => {
                panic!("onboarding is already completed");
            }
        };

        self.set_state(new_bridge_state);
        Ok(())
    }
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export)]
pub enum RpcBridgeStatus {
    Onboarded {},
    Onboarding {
        stage: RpcOnboardingStage,
    },
    Offboarding {
        reason: Arc<BridgeOffboardingReason>,
    },
}

#[allow(async_fn_in_trait)]
pub trait RuntimeExt: Deref<Target = Runtime> {
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
}

impl RuntimeExt for Arc<Runtime> {}
