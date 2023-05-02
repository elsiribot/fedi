use fediffi::bridge::Bridge;
use fediffi::fedimint_core::config::FederationId;
use fediffi::fedimint_core::db::{Database, IDatabase};
use fediffi::fedimint_core::module::registry::ModuleDecoderRegistry;
use fediffi::fedimint_core::{apply, async_trait_maybe_send};
use std::cell::RefCell;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use wasm_bindgen::prelude::*;

#[cfg(target_family = "wasm")]
mod db2;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen]
    pub type EventSink;

    #[wasm_bindgen(method)]
    fn event(this: &EventSink, event_type: String, body: String);
}

struct WasmStorage {
    global: Database,
    federation: StdMutex<HashMap<FederationId, Database>>,
}

impl WasmStorage {
    async fn new() -> anyhow::Result<Self> {
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
        fed.insert(id, db.clone());
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

impl fediffi::event::IEventSink for EventSink {
    fn event(&self, event_type: String, body: String) {
        self.event(event_type, body)
    }
}

use std::sync::Mutex as StdMutex;
thread_local! {
    static LOG_BUFFER: Arc<StdMutex<Vec<u8>>> = Arc::new(StdMutex::new(Vec::new()));
    static BRIDGE: RefCell<Option<Arc<Bridge>>> = RefCell::new(None);
}

#[wasm_bindgen]
pub async fn fedimint_initialize(event_sink: EventSink) {
    std::panic::set_hook(Box::new(|p| {
        let buffer = LOG_BUFFER.with(Arc::clone);
        // the error case should never happen but still avoid a double panic => abort here
        if let Ok(mut buffer) = buffer.lock() {
            // Add the panic info to the buffer, so it shows in future get_info calls.
            buffer.extend_from_slice(&p.to_string().into_bytes());
            buffer.push(b'\n');
        }

        console_error_panic_hook::hook(p);
    }));
    let buffer = LOG_BUFFER.with(Arc::clone);
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::new(
            "info,fediffi=debug,fedimint_client=trace,fedimint_core::api=trace",
        ))
        .with_writer({
            use std::io::Write;
            use tracing_subscriber::fmt::MakeWriter;

            struct MemWriter<'a, T>(std::sync::MutexGuard<'a, T>);
            impl<'a, T: Write> Write for MemWriter<'a, T> {
                fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
                    (*self.0).write(buf)
                }
                fn flush(&mut self) -> std::io::Result<()> {
                    (*self.0).flush()
                }
            }

            struct MemMakeWriter<T>(Arc<StdMutex<T>>);
            impl<'a, T: 'a + Write> MakeWriter<'a> for MemMakeWriter<T> {
                type Writer = MemWriter<'a, T>;
                fn make_writer(&'a self) -> Self::Writer {
                    MemWriter(self.0.lock().expect("lock got posioned"))
                }
            }

            MemMakeWriter(LOG_BUFFER.with(Arc::clone))
        })
        .without_time()
        .init();

    let bridge = fediffi::fedimint_initialize_async(
        Arc::new(WasmStorage::new().await?),
        Arc::new(event_sink),
    )
    .await
    .unwrap();
    BRIDGE.with(|bridge_cell| bridge_cell.replace(Some(bridge)));
}

#[wasm_bindgen]
pub async fn fedimint_rpc(method: String, payload: String) -> String {
    let bridge = BRIDGE
        .with(|bridge| bridge.borrow().clone())
        .expect("bridge not set"); // TODO: improve error
    fediffi::fedimint_rpc_async(bridge, method, payload).await
}

#[wasm_bindgen]
/// Returns a blob with log contents
pub fn get_logs() -> wasm_bindgen::JsValue {
    let buffer = LOG_BUFFER.with(Arc::clone);
    let buffer = buffer.lock().unwrap();
    // application/octet-stream to convince the browser to download the file
    (*gloo_file::File::new_with_options(
        "fedi-wasm.log",
        &**buffer,
        Some("application/octet-stream"),
        None,
    ))
    .clone()
    .into()
}
