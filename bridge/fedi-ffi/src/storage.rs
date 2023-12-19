use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::bail;
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_client::secret::RootSecretStrategy;
use fedimint_core_v1::db::IDatabase;
use fedimint_core_v1::task::{MaybeSend, MaybeSync};
use fedimint_core_v1::{apply, async_trait_maybe_send};
use futures::future::BoxFuture;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use v0_rocksdb::{
    JoinedFederationV0, JoinedFederationV1, JoinedFederationsV0Prefix, JoinedFederationsV1Prefix,
};

use crate::constants::FEDI_FILE_PATH;
use crate::social::SocialRecoveryState;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    /// Database to store all federation joined
    async fn global_database_v0(&self) -> anyhow::Result<fedimint_core_v0::db::Database>;
    // Dpc proposed alternative: open_federation_db(federation_id) which just tries
    // each version in descending order
    async fn federation_idb(&self, db_name: &str) -> anyhow::Result<Box<dyn IDatabase>>;
    async fn federation_database_v2(
        &self,
        db_name: &str,
    ) -> anyhow::Result<fedimint_core::db::Database>;
    /// FIXME: can I get rid of this?
    async fn federation_database_v0(
        &self,
        id: &str,
    ) -> anyhow::Result<fedimint_core_v0::db::Database>;
    async fn federation_idb_v0(
        &self,
        id: &str,
    ) -> anyhow::Result<Box<dyn fedimint_core_v0::db::IDatabase>>;
    async fn delete_federation_db(&self, db_name: &str) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Option<Vec<u8>>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[derive(Serialize, Deserialize)]
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
}

pub struct AppState {
    raw: RwLock<AppStateRaw>,
    storage: Storage,
}

impl AppState {
    /// Loads from existing file if present. If not, attempts to read from
    /// legacy global DB and writes to a new file (migration). If migration
    /// results in error, just loads a default empty file.
    pub async fn load(storage: Storage) -> anyhow::Result<Self> {
        if let Some(app_state) = AppState::existing_from_storage(storage.clone()).await? {
            return Ok(app_state);
        }

        AppState::new_from_legacy_global_database(storage.clone()).await
    }

    async fn existing_from_storage(storage: Storage) -> anyhow::Result<Option<Self>> {
        let app_state_raw = storage.read_file(Path::new(FEDI_FILE_PATH)).await?;

        if let Some(app_state_raw) = app_state_raw {
            Ok(Some(Self {
                raw: RwLock::new(serde_json::from_slice(&app_state_raw)?),
                storage,
            }))
        } else {
            Ok(None)
        }
    }

    async fn new_from_legacy_global_database(storage: Storage) -> anyhow::Result<Self> {
        let app_state = Self::default_with_storage(storage).await;

        // Read v0 and v1 joined federations from legacy global DB
        let db = app_state.storage.global_database_v0().await?;
        let mut dbtx = db.begin_transaction().await;
        let v0_joined = dbtx
            .find_by_prefix(&JoinedFederationsV0Prefix)
            .await
            .collect::<Vec<_>>()
            .await;
        let v1_joined = dbtx
            .find_by_prefix(&JoinedFederationsV1Prefix)
            .await
            .collect::<Vec<_>>()
            .await;
        dbtx.commit_tx().await;

        // Write found v0 and v1 joined federations to fedi file
        app_state
            .with_write_lock(move |state| {
                Box::pin(async move {
                    for (JoinedFederationV0(federation_id), _) in v0_joined {
                        state.joined_federations.insert(
                            federation_id.to_string(),
                            FederationInfo {
                                version: 0,
                                database_name: federation_id.to_string(),
                            },
                        );
                    }
                    for (JoinedFederationV1(federation_id), db_name) in v1_joined {
                        state.joined_federations.insert(
                            federation_id.to_string(),
                            FederationInfo {
                                version: 1,
                                database_name: db_name,
                            },
                        );
                    }
                    Ok(())
                })
            })
            .await?;

        Ok(app_state)
    }

    async fn default_with_storage(storage: Storage) -> Self {
        Self {
            raw: RwLock::new(AppStateRaw {
                format_version: 0,
                root_mnemonic: Bip39RootSecretStrategy::<12>::random(&mut rand::thread_rng()),
                joined_federations: BTreeMap::new(),
                social_recovery_state: None,
                sensitive_log: None,
            }),
            storage,
        }
    }

    pub async fn with_read_lock<T, F>(&self, closure: F) -> T
    where
        F: FnOnce(&AppStateRaw) -> BoxFuture<T>,
    {
        let app_state_raw = self.raw.read().await;
        closure(&app_state_raw).await
    }

    pub async fn with_write_lock<T, F>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut AppStateRaw) -> BoxFuture<anyhow::Result<T>>,
    {
        let mut app_state_raw = self.raw.write().await;

        // Ensure root mnemonic cannot be overwritten while a joined V2 federation
        // exists
        let v2_federation_exists = app_state_raw
            .joined_federations
            .iter()
            .any(|(_, FederationInfo { version, .. })| *version >= 2);
        let root_mnemonic_snapshot = app_state_raw.root_mnemonic.clone();
        let result = closure(&mut app_state_raw).await?;

        if v2_federation_exists && app_state_raw.root_mnemonic != root_mnemonic_snapshot {
            bail!("Root mnemonic cannot be overwritten while joined v2 federations are present");
        }

        self.storage
            .write_file(
                Path::new(FEDI_FILE_PATH),
                serde_json::to_vec::<AppStateRaw>(&app_state_raw)?,
            )
            .await?;
        Ok(result)
    }
}
