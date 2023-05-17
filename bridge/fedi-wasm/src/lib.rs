use fediffi::bridge::Bridge;
use std::cell::RefCell;
use std::sync::Arc;
use storage::WasmStorage;
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

impl fediffi::event::IEventSink for EventSink {
    fn event(&self, event_type: String, body: String) {
        self.event(event_type, body)
    }
}

thread_local! {
    static BRIDGE: RefCell<Option<Arc<Bridge>>> = RefCell::new(None);
}

#[wasm_bindgen]
pub async fn fedimint_initialize(event_sink: EventSink) {
    logging::init();
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
