use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::bail;
use fedimint_core_v1::db::IDatabase;
use fedimint_core_v1::task::{MaybeSend, MaybeSync};
use fedimint_core_v1::{apply, async_trait_maybe_send};
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
struct FediInfo {
    root_mnemonic: Option<bip39::Mnemonic>,

    // federation IDs
    joined_federations_v0: HashSet<String>,

    // federation ID => database name
    joined_federations_v1: HashMap<String, String>,
    joined_federations_v2: HashMap<String, String>,
}

pub struct FediFile {
    fedi_info: RwLock<FediInfo>,
    storage: Storage,
}

impl FediFile {
    pub async fn existing_from_storage(storage: Storage) -> anyhow::Result<Self> {
        let fedi_info = storage
            .read_file(Path::new(FEDI_FILE_PATH))
            .await
            .map(|contents| serde_json::from_slice::<FediInfo>(&contents))??;
        Ok(Self {
            fedi_info: RwLock::new(fedi_info),
            storage,
        })
    }

    pub async fn new_from_legacy_global_database(storage: Storage) -> anyhow::Result<Self> {
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
        for (JoinedFederationV0(federation_id), _) in v0_joined {
            fedi_file
                .join_federation_v0(&federation_id.to_string())
                .await?;
        }
        for (JoinedFederationV1(federation_id), db_name) in v1_joined {
            fedi_file
                .join_federation_v1(&federation_id.to_string(), &db_name)
                .await?;
        }
        fedi_file.save().await?;

        Ok(fedi_file)
    }

    pub async fn default_with_storage(storage: Storage) -> Self {
        Self {
            fedi_info: RwLock::new(FediInfo::default()),
            storage,
        }
    }

    pub async fn save(&self) -> anyhow::Result<()> {
        let fedi_info = self.fedi_info.read().await;
        self.storage
            .write_file(
                Path::new(FEDI_FILE_PATH),
                serde_json::to_vec::<FediInfo>(&fedi_info)?,
            )
            .await
    }

    pub async fn get_root_mnemonic(&self) -> Option<bip39::Mnemonic> {
        self.fedi_info.read().await.root_mnemonic.clone()
    }

    pub async fn set_root_mnemonic(&self, mnemonic: bip39::Mnemonic) -> anyhow::Result<()> {
        if self.fedi_info.read().await.root_mnemonic.is_some() {
            bail!("Cannot overwrite root mnemonic");
        }

        self.fedi_info.write().await.root_mnemonic = Some(mnemonic);
        Ok(())
    }

    pub async fn get_joined_federations_v0(&self) -> HashSet<String> {
        self.fedi_info.read().await.joined_federations_v0.clone()
    }

    // TODO: remove once no longer need to support joining v0 federation
    pub async fn join_federation_v0(&self, federation_id: &str) -> anyhow::Result<()> {
        if self
            .fedi_info
            .read()
            .await
            .joined_federations_v0
            .contains(federation_id)
        {
            bail!("Already joined V0 federation with ID {federation_id}");
        }

        self.fedi_info
            .write()
            .await
            .joined_federations_v0
            .insert(federation_id.to_owned());
        Ok(())
    }

    pub async fn get_joined_federations_v1(&self) -> HashMap<String, String> {
        self.fedi_info.read().await.joined_federations_v1.clone()
    }

    // TODO: remove once no longer need to support joining v1 federation
    pub async fn join_federation_v1(
        &self,
        federation_id: &str,
        db_name: &str,
    ) -> anyhow::Result<()> {
        if self
            .fedi_info
            .read()
            .await
            .joined_federations_v1
            .contains_key(federation_id)
        {
            bail!("Already joined V1 federation with ID {federation_id}");
        }

        self.fedi_info
            .write()
            .await
            .joined_federations_v1
            .insert(federation_id.to_owned(), db_name.to_owned());
        Ok(())
    }

    pub async fn get_joined_federations_v2(&self) -> HashMap<String, String> {
        self.fedi_info.read().await.joined_federations_v2.clone()
    }

    pub async fn join_federation_v2(
        &self,
        federation_id: &str,
        db_name: &str,
    ) -> anyhow::Result<()> {
        if self
            .fedi_info
            .read()
            .await
            .joined_federations_v2
            .contains_key(federation_id)
        {
            bail!("Already joined V2 federation with ID {federation_id}");
        }

        self.fedi_info
            .write()
            .await
            .joined_federations_v2
            .insert(federation_id.to_owned(), db_name.to_owned());
        Ok(())
    }

    /// A federation, if joined, would only exist in one version.
    /// So this function returns None for v0 federations, and
    /// Some(database name) for v1/v2 federations. If the federation
    /// is not joined at all, None is returned.
    pub async fn leave_federation(&self, federation_id: &str) -> Option<String> {
        let mut fedi_info = self.fedi_info.write().await;

        let mut removed_db_name = None;
        fedi_info.joined_federations_v0.remove(federation_id);

        if let Some(db_name) = fedi_info.joined_federations_v1.remove(federation_id) {
            removed_db_name = Some(db_name);
        }

        if let Some(db_name) = fedi_info.joined_federations_v2.remove(federation_id) {
            removed_db_name = Some(db_name);
        }

        removed_db_name
    }
}
