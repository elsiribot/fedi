use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex as StdMutex;

use fediffi::storage::IStorage;
use fedimint_core_v1::db::IDatabase;
use fedimint_core_v1::{apply, async_trait_maybe_send};

use crate::db::MemAndIndexedDb;

pub struct WasmStorage {
    federation: StdMutex<HashMap<String, MemAndIndexedDb>>,
}

impl WasmStorage {
    pub async fn new() -> anyhow::Result<Self> {
        Ok(Self {
            federation: StdMutex::new(HashMap::new()),
        })
    }
}

#[apply(async_trait_maybe_send!)]
impl IStorage for WasmStorage {
    /// Database to store all federation joined
    async fn global_database_v0(&self) -> anyhow::Result<fedimint_core_v0::db::Database> {
        let db = MemAndIndexedDb::new("main").await?;
        let registry = fedimint_core_v0::module::registry::ModuleDecoderRegistry::from_iter([]);
        let db = fedimint_core_v0::db::Database::new(db, registry);
        Ok(db)
    }
    async fn federation_idb(&self, db_name: &str) -> anyhow::Result<Box<dyn IDatabase>> {
        let db = MemAndIndexedDb::new(db_name).await?;
        let mut fed = self.federation.lock().unwrap();
        fed.insert(db_name.to_owned(), db.clone());
        Ok(Box::new(db))
    }

    async fn federation_idb_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<Box<dyn fedimint_core_v0::db::IDatabase>> {
        let db = MemAndIndexedDb::new(&format!("{id}")).await?;
        let mut fed = self.federation.lock().unwrap();
        fed.insert(id.to_string(), db.clone());
        Ok(Box::new(db))
    }

    async fn federation_database_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<fedimint_core_v0::db::Database> {
        let db = MemAndIndexedDb::new(&format!("{id}")).await?;
        // FIXME: this really seems like a footgun
        let registry = fedimint_core_v0::module::registry::ModuleDecoderRegistry::from_iter([]);
        Ok(fedimint_core_v0::db::Database::new(db, registry))
    }

    async fn delete_federation_db(&self, db_name: &str) -> anyhow::Result<()> {
        let mut fed = self.federation.lock().unwrap();
        let db = fed.remove(db_name).unwrap();
        drop(fed);
        db.delete().await?;
        Ok(())
    }
    async fn read_file(&self, _path: &Path) -> anyhow::Result<Vec<u8>> {
        todo!()
    }
    async fn write_file(&self, _path: &Path, _data: Vec<u8>) -> anyhow::Result<()> {
        todo!()
    }
    fn platform_path(&self, _path: &Path) -> PathBuf {
        todo!()
    }
}
