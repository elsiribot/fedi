use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::{bail, Context as _};
use either::Either;
use fedi_social_client::SocialRecoveryState;
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_client::secret::RootSecretStrategy;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use fedimint_derive_secret::DerivableSecret;
use rand::rngs::OsRng;
use state::{
    default_next_federation_prefix, AppStateJson, AppStateJsonBase, AppStateJsonV1,
    AppStateJsonV1Onboarded, AppStateJsonV1Onboarding, DeviceIdentifier, OnboardingStage,
};
use tokio::sync::RwLock;

use crate::constants::FEDI_FILE_PATH;

pub mod state;

// Within the global DB, each federation's DB uses a prefix assigned using an
// incrementing nonce.
const FIRST_FEDERATION_DB_PREFIX: u64 = 1;

// Prefix 0 is reserved for the bridge itself to store information independent
// of any federation's DB.
pub const BRIDGE_DB_PREFIX: u8 = 0;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    async fn federation_database_v2(
        &self,
        db_name: &str,
    ) -> anyhow::Result<fedimint_core::db::Database>;
    async fn delete_federation_db(&self, db_name: &str) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Option<Vec<u8>>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    #[cfg(not(target_family = "wasm"))]
    fn write_file_sync(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

// base for both AppState and AppStateSeedUncommitted
#[derive(Clone)]
struct AppStateStore {
    // Arc surrounding RwLock<AppStateRaw> is required to be able to move the (owned) write lock
    // within the spawn_blocking task in the with_write_lock() function.
    raw: Arc<RwLock<state::AppStateJson>>,
    storage: Storage,
}

// allows clone because transition to seed_committed = true -> false is not
// allowed
#[derive(Clone)]
pub struct AppState {
    // invariant: AppStateJsonV1 is Committed
    inner: AppStateStore,
}

// invariant: AppStateJsonV1 is Uncommitted
pub struct AppStateOnboarding {
    inner: AppStateStore,
}

impl AppStateStore {
    pub async fn with_read_lock<T, F>(&self, closure: F) -> T
    where
        F: FnOnce(&AppStateJsonV1) -> T,
    {
        let app_state_read_lock = self.raw.read().await;
        match &*app_state_read_lock {
            state::AppStateJson::V1(value) => closure(value),
        }
    }

    pub async fn with_write_lock<F, T>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut AppStateJsonV1) -> T,
    {
        let mut app_state_write_lock = self.raw.clone().write_owned().await;
        let mut app_state_copy = app_state_write_lock.clone();
        let state::AppStateJson::V1(v1_ref) = &mut app_state_copy;
        let result = closure(v1_ref);

        #[cfg(not(target_family = "wasm"))]
        {
            let storage = self.storage.clone();
            tokio::task::spawn_blocking(move || {
                storage.write_file_sync(
                    Path::new(FEDI_FILE_PATH),
                    serde_json::to_vec::<state::AppStateJson>(&app_state_copy)?,
                )?;
                *app_state_write_lock = app_state_copy;
                Ok::<(), anyhow::Error>(())
            })
            .await??;
        }
        // wasm has async storage
        #[cfg(target_family = "wasm")]
        {
            self.storage
                .write_file(
                    Path::new(FEDI_FILE_PATH),
                    serde_json::to_vec::<state::AppStateJson>(&app_state_copy)?,
                )
                .await?;
            *app_state_write_lock = app_state_copy;
        }

        Ok(result)
    }
}

impl AppState {
    /// Loads from existing file if present. If not, attempts to read from
    /// legacy global DB and writes to a new file (migration). If migration
    /// results in error, just loads a default empty file.
    pub async fn load(
        storage: Storage,
        new_identifier_v2: DeviceIdentifier,
    ) -> anyhow::Result<Either<AppState, AppStateOnboarding>> {
        if let Some(state) =
            AppState::existing_from_storage(storage.clone(), new_identifier_v2.clone()).await?
        {
            Ok(state)
        } else {
            Ok(Either::Right(AppStateOnboarding::write_new(storage).await?))
        }
    }

    async fn existing_from_storage(
        storage: Storage,
        device_identifier_v2: DeviceIdentifier,
    ) -> anyhow::Result<Option<Either<AppState, AppStateOnboarding>>> {
        let Some(app_state_raw) = storage.read_file(Path::new(FEDI_FILE_PATH)).await? else {
            return Ok(None);
        };

        let Some(value) = Self::parse(app_state_raw, device_identifier_v2)? else {
            return Ok(None);
        };

        let app_state_base = AppStateStore {
            raw: RwLock::new(value).into(),
            storage,
        };

        let is_committed = app_state_base
            .with_read_lock(|state| match state {
                AppStateJsonV1::Onboarded(_) => true,
                AppStateJsonV1::Onboarding(_) => false,
            })
            .await;

        let state = if is_committed {
            Either::Left(AppState {
                inner: app_state_base,
            })
        } else {
            Either::Right(AppStateOnboarding {
                inner: app_state_base,
            })
        };
        Ok(Some(state))
    }

    fn parse(
        app_state_raw: Vec<u8>,
        device_identifier_v2: DeviceIdentifier,
    ) -> Result<Option<state::AppStateJson>, anyhow::Error> {
        Ok(Some(AppStateJson::parse(
            &app_state_raw,
            device_identifier_v2,
        )?))
    }

    pub async fn with_read_lock<T, F>(&self, closure: F) -> T
    where
        F: FnOnce(&state::AppStateJsonV1Onboarded) -> T,
    {
        self.inner
            .with_read_lock(|state| {
                let AppStateJsonV1::Onboarded(state) = state else {
                    panic!("appstate invariant broken");
                };
                closure(state)
            })
            .await
    }

    pub async fn with_write_lock<F, T>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut state::AppStateJsonV1Onboarded) -> T,
    {
        self.inner
            .with_write_lock(|state| {
                let AppStateJsonV1::Onboarded(state) = state else {
                    panic!("appstate invariant broken");
                };
                closure(state)
            })
            .await
    }

    pub async fn root_secret(&self) -> DerivableSecret {
        self.with_read_lock(|state| {
            Bip39RootSecretStrategy::<12>::to_root_secret(&state.root_mnemonic)
        })
        .await
    }

    pub async fn device_identifier(&self) -> DeviceIdentifier {
        let root_secret = self.root_secret().await;
        let enc = self.encrypted_device_identifier().await;
        DeviceIdentifier::from_encrypted_string(&enc, &root_secret)
            .expect("Device ID decryption from disk must never fail")
    }

    pub async fn encrypted_device_identifier(&self) -> String {
        self.with_read_lock(|state| state.encrypted_device_identifier_v2.clone())
            .await
    }

    #[deprecated = "Only use as part of v1->v2 registration migration"]
    pub async fn encrypted_device_identifier_v1(&self) -> Option<String> {
        #[allow(deprecated)]
        self.with_read_lock(|state| state.encrypted_device_identifier_v1.clone())
            .await
    }

    #[deprecated = "Only use as part of v1->v2 registration migration"]
    pub async fn clear_encrypted_device_identifier_v1(&self) -> anyhow::Result<()> {
        #[allow(deprecated)]
        self.with_write_lock(|state| state.encrypted_device_identifier_v1 = None)
            .await
    }

    pub async fn device_index(&self) -> u8 {
        self.with_read_lock(|state| state.device_index).await
    }

    pub async fn root_mnemonic(&self) -> bip39::Mnemonic {
        self.with_read_lock(|state| state.root_mnemonic.clone())
            .await
    }

    /// Get a new prefix for joining a federation.
    pub async fn new_federation_db_prefix(&self) -> anyhow::Result<u64> {
        self.with_write_lock(|x| {
            let value = x.next_federation_db_prefix;
            x.next_federation_db_prefix += 1;
            value
        })
        .await
    }

    pub async fn get_cached_fiat_fx_info(&self) -> Option<state::FiatFXInfo> {
        self.with_read_lock(|state| state.cached_fiat_fx_info.clone())
            .await
    }
}

#[derive(Clone, Debug, Copy)]
pub enum OnboardingCompletionMethod {
    NewSeed,
    GotDeviceIndex(u8),
}

impl AppStateOnboarding {
    async fn write_new(storage: Storage) -> anyhow::Result<AppStateOnboarding> {
        #[allow(deprecated)]
        let app_state_base = AppStateStore {
            raw: RwLock::new(AppStateJson::V1(AppStateJsonV1::Onboarding(
                AppStateJsonV1Onboarding {
                    stage: OnboardingStage::Init {},
                    old_mnemonic: None,
                },
            )))
            .into(),
            storage,
        };

        // Write immediately before returning
        app_state_base.with_write_lock(|_| ()).await?;
        // invariant: held above in default value
        Ok(AppStateOnboarding {
            inner: app_state_base,
        })
    }

    pub async fn stage(&self) -> OnboardingStage {
        self.inner
            .with_read_lock(|state| {
                let AppStateJsonV1::Onboarding(onboarding) = state else {
                    panic!("invariant of app state onboarding broken");
                };
                onboarding.stage.clone()
            })
            .await
    }

    async fn with_write_lock<F, T>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut AppStateJsonV1Onboarding) -> T,
    {
        self.inner
            .with_write_lock(|state| {
                let AppStateJsonV1::Onboarding(state) = state else {
                    panic!("invariant of app state onboarding broken");
                };
                closure(state)
            })
            .await
    }

    /// Init -> SocialRecovery or SocialRecovery -> SocialRecovery
    pub async fn social_recovery_start_or_update(
        &self,
        social_recovery_state: SocialRecoveryState,
    ) -> anyhow::Result<()> {
        self.with_write_lock(|state| {
            match state.stage {
                OnboardingStage::Init {} => {}
                OnboardingStage::SocialRecovery { .. } => {}
                _ => bail!("Illegal transition in onboarding (social recovery)"),
            };
            state.stage = OnboardingStage::SocialRecovery {
                state: social_recovery_state,
            };
            Ok(())
        })
        .await??;
        Ok(())
    }

    /// SocialRecovery -> Init
    pub async fn social_recovery_cancel(&self) -> anyhow::Result<()> {
        self.with_write_lock(|state| {
            match state.stage {
                OnboardingStage::SocialRecovery { .. } => {}
                _ => bail!("Illegal transition in onboarding (social recovery)"),
            };
            state.stage = OnboardingStage::Init {};
            Ok(())
        })
        .await??;
        Ok(())
    }

    /// Init -> DeviceIndexSelection or SocialRecovery -> DeviceIndexSelection
    pub async fn restore_mnemonic(
        &self,
        root_mnemonic: bip39::Mnemonic,
        device_identifier: DeviceIdentifier,
    ) -> anyhow::Result<()> {
        self.with_write_lock(|state| {
            let social_recovery_state = match &state.stage {
                OnboardingStage::Init {} => None,
                OnboardingStage::SocialRecovery { state } => Some(state.clone()),
                _ => bail!("Illegal transition in onboarding (social recovery)"),
            };
            let secret = Bip39RootSecretStrategy::<12>::to_root_secret(&root_mnemonic);
            state.stage = OnboardingStage::DeviceIndexSelection {
                encrypted_device_identifier: device_identifier
                    .encrypt_and_hex_encode(&secret)
                    .context("failed to encrypt")?,
                root_mnemonic,
                social_recovery_state,
            };
            Ok(())
        })
        .await??;
        Ok(())
    }

    /// Call this to finalize the seed and move self to AppState
    /// NewSeed : Init -> complete
    /// GotDeviceIndex : DeviceIndexSelection -> complete
    pub async fn complete_onboarding(
        self,
        method: OnboardingCompletionMethod,
        device_identifier: DeviceIdentifier,
    ) -> Result<AppState, (Self, anyhow::Error)> {
        let result = self
            .inner
            .with_write_lock(|state| {
                let AppStateJsonV1::Onboarding(uncommitted) = state else {
                    panic!("invariant of app state onboarding broken");
                };
                let (
                    root_mnemonic,
                    encrypted_device_identifier,
                    social_recovery_state,
                    device_index,
                ) = match (method, uncommitted.stage.clone()) {
                    (OnboardingCompletionMethod::NewSeed, OnboardingStage::Init {}) => {
                        let root_mnemonic = Bip39RootSecretStrategy::<12>::random(&mut OsRng);
                        let secret = Bip39RootSecretStrategy::<12>::to_root_secret(&root_mnemonic);
                        (
                            root_mnemonic,
                            device_identifier
                                .encrypt_and_hex_encode(&secret)
                                .context("failed to encrypt")?,
                            None,
                            // device index 0 for new seed
                            0,
                        )
                    }
                    (
                        OnboardingCompletionMethod::GotDeviceIndex(device_index),
                        OnboardingStage::DeviceIndexSelection {
                            root_mnemonic,
                            social_recovery_state,
                            encrypted_device_identifier,
                        },
                    ) => (
                        root_mnemonic,
                        encrypted_device_identifier,
                        social_recovery_state,
                        device_index,
                    ),
                    _ => bail!("Illegal state for {method:?}"),
                };

                #[allow(deprecated)]
                let new_state = AppStateJsonV1::Onboarded(AppStateJsonV1Onboarded {
                    // preserve old mnemonic
                    old_mnemonic: uncommitted.old_mnemonic.clone(),
                    social_recovery_state,
                    device_index,
                    encrypted_device_identifier_v2: encrypted_device_identifier.clone(),
                    matrix_session: None,
                    base: AppStateJsonBase {
                        root_mnemonic,
                        joined_federations: BTreeMap::new(),
                        joined_communities: BTreeMap::new(),
                        sensitive_log: None,
                        // When setting up a new AppState (fresh install), set
                        // encrypted_device_identifier_v1 as None which marks the transfer of
                        // ownership as complete.
                        encrypted_device_identifier_v1: None,
                        next_federation_db_prefix: default_next_federation_prefix(),
                        matrix_display_name: None,
                        cached_fiat_fx_info: None,
                        last_device_registration_timestamp: None,
                    },
                });
                *state = new_state;
                Ok(())
            })
            .await;
        match result {
            Err(err) | Ok(Err(err)) => Err((self, err)),
            Ok(Ok(())) => Ok(AppState { inner: self.inner }),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_old_fedi_file_compatible() {
        let old_file = String::from(r#"{"federations": {"s": "y"}}"#);
        assert!(
            AppState::parse(old_file.into(), "test:test:asdfjnadnjs".parse().unwrap())
                .unwrap()
                .is_none()
        );
    }
    #[test]
    fn test_fedi_file_seed_is_not_overwritten() {
        let old_file = String::from(r#"{"format_version": 0, "root_seed": "foo"}"#);
        assert!(
            AppState::parse(old_file.into(), "test:test:asdfjnadnjs".parse().unwrap()).is_err()
        );
    }
}
