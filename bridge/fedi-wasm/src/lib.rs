use std::cell::RefCell;
use std::panic::AssertUnwindSafe;
use std::sync::Arc;

use anyhow::Context;
use fediffi::bridge::Bridge;
use fediffi::error::ErrorCode;
use fediffi::event::IEventSink;
use fediffi::rpc::rpc_error;
use futures::FutureExt;
use storage::WasmStorage;
use tracing::warn;
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
    let value = AssertUnwindSafe(fedimint_initialize_inner(event_sink))
        .catch_unwind()
        .await;
    match value {
        Ok(Ok(())) => String::from("{}"),
        Ok(Err(e)) => rpc_error(&e),
        Err(_) => rpc_error(&anyhow::format_err!(ErrorCode::Panic)),
    }
}

pub async fn fedimint_initialize_inner(event_sink: EventSink) -> anyhow::Result<()> {
    let event_sink = Arc::new(event_sink);
    logging::init(event_sink.clone());
    if BRIDGE.with(|b| b.borrow().is_some()) {
        warn!("bridge is already initialized");
        return Ok(());
    }
    let storage = WasmStorage::new()
        .await
        .context("Failed to initialize storage")?;

    let bridge = fediffi::rpc::fedimint_initialize_async(Arc::new(storage), event_sink.clone())
        .await
        .context("Failed to initialize the bridge")?;

    BRIDGE.with(|bridge_cell| bridge_cell.replace(Some(bridge)));
    Ok(())
}

#[wasm_bindgen]
pub async fn fedimint_rpc(method: String, payload: String) -> String {
    let value = AssertUnwindSafe(async move {
        let Some(bridge) = BRIDGE.with(|b| b.borrow().clone()) else {
            return r#"{"error": "Bridge not initialized"}"#.to_owned();
        };
        fediffi::rpc::fedimint_rpc_async(bridge, method, payload).await
    })
    .catch_unwind()
    .await;

    match value {
        Ok(value) => value,
        Err(_) => rpc_error(&anyhow::format_err!(ErrorCode::Panic)),
    }
}
