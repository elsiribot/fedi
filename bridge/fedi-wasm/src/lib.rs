use wasm_bindgen::prelude::*;
use std::path::Path;
use std::sync::Arc;
use fediffi::fedimint_core::{apply, async_trait_maybe_send};
use fediffi::fedimint_core::db::Database;
use fediffi::fedimint_core::db::mem_impl::MemDatabase;
use fediffi::mint_client::module_decode_stubs;

mod db;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen]
    pub type EventSink;

    #[wasm_bindgen(method)]
    fn event(this: &EventSink, event_type: String, body: String);
}

struct WasmStorage(Database);

#[apply(async_trait_maybe_send!)]
impl fediffi::storage::IStorage for WasmStorage {
    /// Database to store all federation joined
    async fn global_db(&self) -> anyhow::Result<Database> {
        Ok(self.0.clone())
    }
    async fn federation_db(&self, name: &str) -> anyhow::Result<Database> {
        Ok(self.0.clone())
    }

    async fn delete_federation_db(&self, name: &str) -> anyhow::Result<()> {
        todo!()
    }
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>> {
        todo!()
    }
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()> {
        todo!()
    }
}

impl fediffi::event::IEventSink for EventSink {
    fn event(&self, event_type: String, body: String) {
        self.event(event_type, body)
    }
}

#[wasm_bindgen]
pub async fn fedimint_initialize(event_sink: EventSink) {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    tracing_wasm::set_as_global_default();
    let db = MemDatabase::new();
    let db = Database::new(db, module_decode_stubs());
    fediffi::fedimint_initialize_async(Arc::new(WasmStorage(db)), Arc::new(event_sink)).await.unwrap();
}

#[wasm_bindgen]
pub async fn fedimint_rpc(method: String, payload: String) -> String {
    fediffi::fedimint_rpc_async(method, payload).await
}
