use std::cell::RefCell;
use std::sync::Arc;

use fediffi::bridge::Bridge;
use fediffi::event::IEventSink;
use storage::WasmStorage;
use tracing::error;
use wasm_bindgen::prelude::*;

mod db;
mod logging;
mod storage;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen]
    pub type EventSink;

    #[wasm_bindgen(method)]
    fn event(this: &EventSink, event_type: String, body: String);
}

impl IEventSink for EventSink {
    fn event(&self, event_type: String, body: String) {
        self.event(event_type, body)
    }
}

thread_local! {
    static BRIDGE: RefCell<Option<Arc<Bridge>>> = RefCell::new(None);
}

#[wasm_bindgen]
pub async fn fedimint_initialize(event_sink: EventSink) -> String {
    let event_sink = Arc::new(event_sink);
    logging::init(event_sink.clone());
    if BRIDGE.with(|b| b.borrow().is_some()) {
        error!("bridge is already initialized");
        return;
    }
    let storage = match WasmStorage::new().await {
        Ok(storage) => Arc::new(storage),
        Err(e) => {
            error!("Failed to initialize storage {:?}", e);
            return;
        }
    };
    let bridge = match fediffi::rpc::fedimint_initialize_async(storage, event_sink).await {
        Ok(bridge) => bridge,
        Err(e) => {
            error!("Failed to initialize the bridge: {:?}", e);
            return;
        }
    };
    BRIDGE.with(|bridge_cell| bridge_cell.replace(Some(bridge)));
}

#[wasm_bindgen]
pub async fn fedimint_rpc(method: String, payload: String) -> String {
    let bridge = BRIDGE
        .with(|bridge| bridge.borrow().clone())
        .expect("bridge not set"); // TODO: improve error
    fediffi::rpc::fedimint_rpc_async(bridge, method, payload).await
}
