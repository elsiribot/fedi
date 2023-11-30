use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;

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
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[derive(Serialize, Deserialize, Default)]
pub struct FediInfo {
    pub root_mnemonic: Option<bip39::Mnemonic>,

    // federation IDs
    pub joined_federations_v0: HashSet<String>,

    // federation ID => database name
    pub joined_federations_v1: HashMap<String, String>,
    pub joined_federations_v2: HashMap<String, String>,
}

pub struct FediFile {
    fedi_info: RwLock<FediInfo>,
    storage: Storage,
}

impl FediFile {
    pub async fn load(storage: Storage) -> Self {
        FediFile::existing_from_storage(storage.clone())
            .await
            .unwrap_or(
                FediFile::new_from_legacy_global_database(storage.clone())
                    .await
                    .unwrap_or(FediFile::default_with_storage(storage.clone()).await),
            )
    }

    async fn existing_from_storage(storage: Storage) -> anyhow::Result<Self> {
        let fedi_info = storage
            .read_file(Path::new(FEDI_FILE_PATH))
            .await
            .map(|contents| serde_json::from_slice::<FediInfo>(&contents))??;
        Ok(Self {
            fedi_info: RwLock::new(fedi_info),
            storage,
        })
    }

    async fn new_from_legacy_global_database(storage: Storage) -> anyhow::Result<Self> {
        let fedi_file = Self::default_with_storage(storage).await;

        // Read v0 and v1 joined federations from legacy global DB
        let db = fedi_file.storage.global_database_v0().await?;
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
        fedi_file
            .with_write_lock(move |fedi_info| {
                Box::pin(async move {
                    for (JoinedFederationV0(federation_id), _) in v0_joined {
                        fedi_info
                            .joined_federations_v0
                            .insert(federation_id.to_string());
                    }
                    for (JoinedFederationV1(federation_id), db_name) in v1_joined {
                        fedi_info
                            .joined_federations_v1
                            .insert(federation_id.to_string(), db_name);
                    }
                    Ok(())
                })
            })
            .await?;

        Ok(fedi_file)
    }

    async fn default_with_storage(storage: Storage) -> Self {
        Self {
            fedi_info: RwLock::new(FediInfo::default()),
            storage,
        }
    }

    pub async fn with_read_lock<T, F>(&self, closure: F) -> T
    where
        F: FnOnce(&FediInfo) -> BoxFuture<T>,
    {
        let fedi_info = self.fedi_info.read().await;
        closure(&fedi_info).await
    }

    pub async fn with_write_lock<T, F>(&self, closure: F) -> anyhow::Result<T>
    where
        F: FnOnce(&mut FediInfo) -> BoxFuture<anyhow::Result<T>>,
    {
        let mut fedi_info = self.fedi_info.write().await;
        let result = closure(&mut fedi_info).await?;
        self.storage
            .write_file(
                Path::new(FEDI_FILE_PATH),
                serde_json::to_vec::<FediInfo>(&fedi_info)?,
            )
            .await?;
        Ok(result)
    }
}
