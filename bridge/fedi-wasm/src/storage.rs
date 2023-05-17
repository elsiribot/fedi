use fediffi::fedimint_core::{
    apply, async_trait_maybe_send,
    config::FederationId,
    db::{Database, IDatabase},
    module::registry::ModuleDecoderRegistry,
};

use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Mutex as StdMutex,
};

use crate::db::MemAndIndexedDb;

pub struct WasmStorage {
    global: Database,
    federation: StdMutex<HashMap<FederationId, MemAndIndexedDb>>,
}

impl WasmStorage {
    pub async fn new() -> anyhow::Result<Self> {
        let db = MemAndIndexedDb::new("main").await.unwrap();
        let db = Database::new(db, ModuleDecoderRegistry::from_iter([]));
        Ok(Self {
            global: db,
            federation: StdMutex::new(HashMap::new()),
        })
    }
}

#[apply(async_trait_maybe_send!)]
impl fediffi::storage::IStorage for WasmStorage {
    /// Database to store all federation joined
    async fn global_db(&self) -> anyhow::Result<Database> {
        Ok(self.global.clone())
    }
    async fn federation_db(&self, id: &FederationId) -> anyhow::Result<Box<dyn IDatabase>> {
        let db = MemAndIndexedDb::new(&format!("{id}")).await?;
        let mut fed = self.federation.lock().unwrap();
        fed.insert(*id, db.clone());
        Ok(Box::new(db))
    }

    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()> {
        let mut fed = self.federation.lock().unwrap();
        let db = fed.remove(id).unwrap();
        drop(fed);
        db.delete().await?;
        Ok(())
    }
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>> {
        todo!()
    }
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()> {
        todo!()
    }
    fn platform_path(&self, path: &Path) -> PathBuf {
        todo!()
    }
}
