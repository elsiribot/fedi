use std::ops::Deref;
use std::path::PathBuf;
use std::sync::{Arc, Mutex as StdMutex, OnceLock};

use anyhow::{anyhow, bail, Context, Result};
use bitcoin::key::Secp256k1;
use either::Either;
use fedimint_core::db::{Database, IDatabaseTransactionOpsCoreTyped as _};
use fedimint_derive_secret::{ChildId, DerivableSecret};
pub use full::{BridgeFull, BridgeOffboardingReason};
use futures::StreamExt as _;
use nostr::secp256k1::Message;
use onboarding::{BridgeOnboarding, RpcOnboardingStage};
use rpc_types::{RpcPublicKey, RpcSignedLnurlMessage};
use runtime::api::IFediApi;
use runtime::bridge_runtime::Runtime;
use runtime::constants::LNURL_CHILD_ID;
use runtime::db::FederationPendingRejoinFromScratchKeyPrefix;
use runtime::event::EventSink;
use runtime::features::FeatureCatalog;
use runtime::storage::state::{DeviceIdentifier, FiatFXInfo};
use runtime::storage::{AppState, OnboardingCompletionMethod, Storage};
use runtime::utils::PoisonedLockExt;
use serde::Serialize;
use ts_rs::TS;

pub mod bg_matrix;
pub mod onboarding;
pub mod providers;

mod full;

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
