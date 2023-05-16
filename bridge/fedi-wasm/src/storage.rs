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

use crate::db2;

pub struct WasmStorage {
    global: Database,
    federation: StdMutex<HashMap<FederationId, Database>>,
}

impl WasmStorage {
    pub async fn new() -> anyhow::Result<Self> {
        let db = db2::MemDatabase::new("main").await.unwrap();
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
        let fed = self.federation.lock().unwrap(); // TODO: find a async mutex
        let db = db2::MemDatabase::new(&format!("{id}")).await?;
        fed.insert(*id, db.clone());
        Ok(db)
    }

    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()> {
        let fed = self.federation.lock().unwrap(); // TODO: find a async mutex
        fed.remove(id);
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
