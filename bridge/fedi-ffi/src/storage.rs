use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::bail;
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_client::secret::RootSecretStrategy;
use fedimint_core::core::ModuleKind;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::error;

use crate::constants::FEDI_FILE_PATH;
use crate::social::SocialRecoveryState;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    async fn federation_database_v2(
        &self,
        db_name: &str,
    ) -> anyhow::Result<fedimint_core::db::Database>;
    async fn delete_federation_db(&self, db_name: &str) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Option<Vec<u8>>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[derive(Serialize, Deserialize, Clone)]
pub struct AppStateRaw {
    /// Version indicator for the app state
    pub format_version: u32,

    /// Root mnemonic that's used to derive all secrets in the app
    pub root_mnemonic: bip39::Mnemonic,

    /// Mapping of federation ID => FederationInfo
    pub joined_federations: BTreeMap<String, FederationInfo>,

    // Social recovery state
    pub social_recovery_state: Option<SocialRecoveryState>,

    pub sensitive_log: Option<bool>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FederationInfo {
    /// The version of the federation, mostly characterized by consensus version
    pub version: u32,

    /// The name used for the database file for the federation's fedimint-client
    /// instance on disk
    pub database_name: String,

    /// The Fedi fee schedule to use for transactions made by the user within
    /// this federation.
    #[serde(default)]
    pub fedi_fee_schedule: FediFeeSchedule,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct FediFeeSchedule {
    /// The minimum amount of fee in msat that must be accrued before an attempt
    /// is made to remit it to Fedi.
    pub remittance_threshold_msat: u64,

    /// Different types of transactions may have different fees. So each known
    /// module (identified by ModuleKind) has its own fee schedule for its
    /// transactions.
    pub modules: BTreeMap<ModuleKind, ModuleFediFeeSchedule>,
}

impl Default for FediFeeSchedule {
    fn default() -> Self {
        let mut modules = BTreeMap::new();
        // Default all fees to 0 for now.
        // TODO shaurya change defaults to non-0 when closer to live testing/prod.
        modules.insert(
            fedimint_mint_client::KIND,
            ModuleFediFeeSchedule {
                send_ppm: 0,
                receive_ppm: 0,
            },
        );
        modules.insert(
            fedimint_ln_common::KIND,
            ModuleFediFeeSchedule {
                send_ppm: 0,
                receive_ppm: 0,
            },
        );
        modules.insert(
            fedimint_wallet_client::KIND,
            ModuleFediFeeSchedule {
                send_ppm: 0,
                receive_ppm: 0,
            },
        );
        modules.insert(
            stability_pool_client::common::KIND,
            ModuleFediFeeSchedule {
                send_ppm: 0,
                receive_ppm: 0,
            },
        );
        Self {
            remittance_threshold_msat: 100,
            modules,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct ModuleFediFeeSchedule {
    /// Represents the fee to charge on the amount in ppm whenever a module
    /// contributes an input to a transaction.
    pub send_ppm: u64,

    /// Represents the fee to charge on the amount in ppm whenever a module
    /// contributes an output to a transaction.
    pub receive_ppm: u64,
}

pub struct AppState {
    raw: RwLock<Arc<AppStateRaw>>,
    storage: Storage,
}

impl AppState {
    /// Loads from existing file if present. If not, attempts to read from
    /// legacy global DB and writes to a new file (migration). If migration
    /// results in error, just loads a default empty file.
    pub async fn load(storage: Storage) -> anyhow::Result<Self> {
        if let Some(state) = AppState::existing_from_storage(storage.clone()).await? {
            Ok(state)
        } else {
            Ok(Self::default_with_storage(storage).await)
        }
    }

    async fn existing_from_storage(storage: Storage) -> anyhow::Result<Option<Self>> {
        let Some(app_state_raw) = storage.read_file(Path::new(FEDI_FILE_PATH)).await? else {
            return Ok(None);
        };

        let Some(value) = Self::parse(app_state_raw)? else {
            return Ok(None);
        };

        Ok(Some(Self {
            raw: RwLock::new(Arc::new(value)),
            storage,
        }))
    }

    fn parse(app_state_raw: Vec<u8>) -> Result<Option<AppStateRaw>, anyhow::Error> {
        #[derive(Clone, Deserialize)]
        struct HasFormatVersion {
            #[allow(unused)]
            format_version: u32,
        }
        if let Err(err) = serde_json::from_slice::<HasFormatVersion>(&app_state_raw) {
            error!(%err, "invalid fedi file");
            return Ok(None);
        }
        Ok(Some(serde_json::from_slice(&app_state_raw)?))
    }

    async fn default_with_storage(storage: Storage) -> Self {
        Self {
            raw: RwLock::new(Arc::new(AppStateRaw {
                format_version: 0,
                root_mnemonic: Bip39RootSecretStrategy::<12>::random(&mut rand::thread_rng()),
                joined_federations: BTreeMap::new(),
                social_recovery_state: None,
                sensitive_log: None,
            })),
            storage,
        }
    }

    pub async fn with_read_lock<T, F>(&self, closure: F) -> T
    where
        F: FnOnce(&AppStateRaw) -> T,
    {
        let app_state_raw = self.raw.read().await.clone();
        closure(&app_state_raw)
    }

    pub async fn with_write_lock<F, T>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut AppStateRaw) -> T,
    {
        let mut app_state_in_memory = self.raw.write().await;

        // Ensure root mnemonic cannot be overwritten while a joined V2 federation
        // exists
        let v2_federation_exists = app_state_in_memory
            .joined_federations
            .iter()
            .any(|(_, FederationInfo { version, .. })| *version >= 2);
        let mut app_state_raw_new = app_state_in_memory.as_ref().clone();
        let result = closure(&mut app_state_raw_new);

        if v2_federation_exists
            && app_state_raw_new.root_mnemonic != app_state_in_memory.root_mnemonic
        {
            bail!("Root mnemonic cannot be overwritten while joined v2 federations are present");
        }

        self.storage
            .write_file(
                Path::new(FEDI_FILE_PATH),
                serde_json::to_vec::<AppStateRaw>(&app_state_raw_new)?,
            )
            .await?;
        *app_state_in_memory = Arc::new(app_state_raw_new);
        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_old_fedi_file_compatible() {
        let old_file = String::from(r#"{"federations": {"s": "y"}}"#);
        assert!(AppState::parse(old_file.into()).unwrap().is_none());
    }
    #[test]
    fn test_fedi_file_seed_is_not_overwritten() {
        let old_file = String::from(r#"{"format_version": 0, "root_seed": "foo"}"#);
        assert!(AppState::parse(old_file.into()).is_err());
    }
}
