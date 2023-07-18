use anyhow::bail;
use fediffi::{storage::IStorage, translate::Translate};
use fedimint_core::{
    apply, async_trait_maybe_send,
    config::FederationId,
    db::{Database, IDatabase},
    module::registry::ModuleDecoderRegistry,
};
use rexie::TransactionMode;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::{Arc, Mutex as StdMutex},
};
use wasm_bindgen::{JsCast, JsValue};

use crate::db::{rexie_to_anyhow, MemAndIndexedDb};

pub struct WasmStorage {
    rexie_files: Arc<rexie::Rexie>,
    federation: StdMutex<HashMap<FederationId, MemAndIndexedDb>>,
}

impl WasmStorage {
    pub async fn new() -> anyhow::Result<Self> {
        let rexie_files = rexie::Rexie::builder("files")
            .add_object_store(rexie::ObjectStore::new("default"))
            .build()
            .await
            .map_err(rexie_to_anyhow)?;
        Ok(Self {
            rexie_files: Arc::new(rexie_files),
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
    async fn federation_idb(&self, id: &FederationId) -> anyhow::Result<Box<dyn IDatabase>> {
        let db = MemAndIndexedDb::new(&format!("{id}")).await?;
        let mut fed = self.federation.lock().unwrap();
        fed.insert(*id, db.clone());
        Ok(Box::new(db))
    }

    async fn federation_idb_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<Box<dyn fedimint_core_v0::db::IDatabase>> {
        let db = MemAndIndexedDb::new(&format!("{id}")).await?;
        let mut fed = self.federation.lock().unwrap();
        fed.insert(id.translate(), db.clone());
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

    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()> {
        let mut fed = self.federation.lock().unwrap();
        let db = fed.remove(id).unwrap();
        drop(fed);
        db.delete().await?;
        Ok(())
    }
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>> {
        let transaction = self
            .rexie_files
            .transaction(&["default"], TransactionMode::ReadOnly)
            .map_err(rexie_to_anyhow)?;
        let store = transaction.store("default").map_err(rexie_to_anyhow)?;
        let key = JsValue::from_str(&path.to_str().expect("path is valid unicode"));
        let value = store.get(&key).await;
        match value {
            Ok(value) => match value.dyn_into::<js_sys::Uint8Array>() {
                Ok(v) => Ok(v.to_vec()),
                Err(e) => bail!(format!("failed to read_file: {e:?}")),
            },
            Err(e) => Err(rexie_to_anyhow(e)),
        }
    }
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()> {
        let transaction = self
            .rexie_files
            .transaction(&["default"], TransactionMode::ReadWrite)
            .map_err(rexie_to_anyhow)?;
        let store = transaction.store("default").map_err(rexie_to_anyhow)?;
        let key = JsValue::from_str(&path.to_str().expect("path is valid unicode"));
        let value = js_sys::Uint8Array::from(&data[..]);
        store
            .put(&value, Some(&key))
            .await
            .map_err(rexie_to_anyhow)?;
        Ok(())
    }
    fn platform_path(&self, path: &Path) -> PathBuf {
        todo!()
    }
}
