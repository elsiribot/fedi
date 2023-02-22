use crate::FedimintError;
use crate::{event::EventSink, fedimint_initialize_async, fedimint_rpc_async};
use lazy_static::lazy_static;
use tracing::error;

lazy_static! {
    static ref RUNTIME: tokio::runtime::Runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("failed to build runtime");
}

uniffi_macros::include_scaffolding!("fedi");

// TODO: send error message
pub fn fedimint_initialize(data_dir: String, log_level: String, event_sink: Box<dyn EventSink>) {
    RUNTIME.block_on(async {
        fedimint_initialize_async(data_dir, &log_level, event_sink)
            .await
            .unwrap_or_else(|e| {
                error!("Failed to initialize the bridge: {:?}", e);
            });
    })
}
pub fn fedimint_rpc(method: String, payload: String) -> String {
    RUNTIME.block_on(async move { fedimint_rpc_async(method, payload).await })
}

pub fn fedimint_get_supported_events() -> Vec<String> {
    return vec![
        String::from("federation"),
        String::from("transaction"),
        String::from("socialRecovery"),
        String::from("recoveryFileCreation"),
        String::from("log"),
    ];
}
