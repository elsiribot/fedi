use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::Arc;

use anyhow::bail;
use fedimint_core_v1::db::IDatabase;
use fedimint_core_v1::task::{MaybeSend, MaybeSync};
use fedimint_core_v1::{apply, async_trait_maybe_send};
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

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
    pub root_mnemonic_entropy: Option<Vec<u8>>,

    // federation IDs
    pub joined_federations_v0: HashSet<String>,

    // federation ID => database name
    pub joined_federations_v1: HashMap<String, String>,
    pub joined_federations_v2: HashMap<String, String>,
}

pub struct FediFile {
    pub fedi_info: Arc<Mutex<FediInfo>>,
    pub storage: Storage,
}

impl FediFile {
    pub async fn existing_from_storage(storage: Storage) -> anyhow::Result<Self> {
        let fedi_info = storage
            .read_file(Path::new(FEDI_FILE_PATH))
            .await
            .map(|contents| serde_json::from_slice::<FediInfo>(&contents))??;
        Ok(Self {
            fedi_info: Arc::new(Mutex::new(fedi_info)),
            storage,
        })
    }

    pub async fn new_with_storage(storage: Storage) -> Self {
        Self {
            fedi_info: Arc::new(Mutex::new(FediInfo::default())),
            storage,
        }
    }

    pub async fn save(&self) -> anyhow::Result<()> {
        let fedi_info = self.fedi_info.lock().await;
        self.storage
            .write_file(
                Path::new(FEDI_FILE_PATH),
                serde_json::to_vec::<FediInfo>(&fedi_info)?,
            )
            .await
    }

    pub async fn set_root_mnemonic_entropy(&self, entropy: Vec<u8>) -> anyhow::Result<()> {
        let mut fedi_info = self.fedi_info.lock().await;

        if fedi_info.root_mnemonic_entropy.is_some() {
            bail!("Cannot overwrite root mnemonic entropy");
        }

        fedi_info.root_mnemonic_entropy = Some(entropy);
        Ok(())
    }

    // TODO: remove once no longer need to support joining v0 federation
    pub async fn join_federation_v0(&self, federation_id: &str) -> anyhow::Result<()> {
        let mut fedi_info = self.fedi_info.lock().await;

        if fedi_info.joined_federations_v0.contains(federation_id) {
            bail!("Already joined V0 federation with ID {federation_id}");
        }

        fedi_info
            .joined_federations_v0
            .insert(federation_id.to_owned());
        Ok(())
    }

    // TODO: remove once no longer need to support joining v1 federation
    pub async fn join_federation_v1(
        &self,
        federation_id: &str,
        db_name: &str,
    ) -> anyhow::Result<()> {
        let mut fedi_info = self.fedi_info.lock().await;

        if fedi_info.joined_federations_v1.contains_key(federation_id) {
            bail!("Already joined V1 federation with ID {federation_id}");
        }

        fedi_info
            .joined_federations_v1
            .insert(federation_id.to_owned(), db_name.to_owned());
        Ok(())
    }

    pub async fn join_federation_v2(
        &self,
        federation_id: &str,
        db_name: &str,
    ) -> anyhow::Result<()> {
        let mut fedi_info = self.fedi_info.lock().await;

        if fedi_info.joined_federations_v2.contains_key(federation_id) {
            bail!("Already joined V2 federation with ID {federation_id}");
        }

        fedi_info
            .joined_federations_v2
            .insert(federation_id.to_owned(), db_name.to_owned());
        Ok(())
    }

    pub async fn leave_federation(&self, federation_id: &str) {
        let mut fedi_info = self.fedi_info.lock().await;

        fedi_info.joined_federations_v0.remove(federation_id);
        fedi_info.joined_federations_v1.remove(federation_id);
        fedi_info.joined_federations_v2.remove(federation_id);
    }
}
