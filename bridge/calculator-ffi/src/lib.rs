pub mod bridge;
pub mod event;
pub mod logging;
pub mod payment;
pub mod tx;
pub mod types;

use std::{path::PathBuf, str::FromStr, sync::Arc};

use fedimint_api::Amount;
use lazy_static::lazy_static;

uniffi_macros::include_scaffolding!("calculator");

use anyhow::anyhow;
use bridge::{Bridge, Federation};
use lightning_invoice::Invoice;
use logging::init_logging;
use tokio::sync::Mutex;
use tx::Transaction;
use types::hacky_millisat_to_sat;

use crate::event::Event;

type Result<T> = std::result::Result<T, FedimintError>;

#[derive(Debug, thiserror::Error)]
pub enum FedimintError {
    #[error("{0}")]
    OtherError(#[from] anyhow::Error),
}

lazy_static! {
    static ref RUNTIME: tokio::runtime::Runtime = tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("failed to build runtime");
    static ref BRIDGE: Mutex<Option<Arc<Bridge>>> = Mutex::new(None);
}

async fn set_bridge(bridge: Bridge) {
    tracing::info!("resetting bridge");
    if let Some(b) = BRIDGE.lock().await.clone() {
        let pollers = b.pollers.lock().await;
        for poller in pollers.iter() {
            poller.abort();
        }
    }
    *BRIDGE.lock().await = Some(Arc::new(bridge));
    tracing::info!("reset bridge");
}

async fn get_bridge() -> Option<Arc<Bridge>> {
    tracing::info!("getting bridge");
    let bridge = BRIDGE.lock().await.clone();
    tracing::info!("got bridge");
    bridge
}

async fn get_fed() -> Arc<Federation> {
    let bridge = get_bridge().await.expect("there should be a federation");
    let lock = bridge.clients.lock().await;
    let federation = lock.get("testfed").unwrap();
    federation.clone()
}

pub fn fedimint_init(data_dir: String, event_sink: Box<dyn EventSink>) -> Result<()> {
    RUNTIME.block_on(async {
        let event_sink = Arc::new(EventSinkWrapper { event_sink });
        init_logging(event_sink.clone());
        tracing::info!("init called ...");

        let bridge = Bridge::new(PathBuf::from(data_dir), event_sink.clone());

        // Auto-join testfed
        {
            let clients = bridge.clients.lock().await;
            if clients.len() == 0 {
                let federation = Federation::join(
                    String::from(r#"{"members":[[0,"ws://188.166.55.8:4001"]]}"#),
                    bridge.data_dir.clone(),
                    event_sink.clone(),
                )
                .await?;
                bridge.join_federation(Arc::new(federation)).await;
            }
        }

        set_bridge(bridge).await;

        Ok(())
    })
}

// TODO: can we return lightning_invoice::Invoice type?
pub fn fedimint_generate_invoice(amount: String, description: String) -> Result<String> {
    RUNTIME.block_on(async {
        tracing::info!("calling generate_invoice");
        let amount: u64 = amount.parse().unwrap(); // FIXME
        tracing::info!("partsed amount");
        let federation = get_fed().await;
        tracing::info!("got fed");
        let amount = Amount::from_sat(amount);
        let invoice = federation.generate_invoice(amount, description).await?;
        tracing::info!("got invoice {}", invoice.to_string());
        Ok(invoice.to_string())
    })
}

pub fn fedimint_pay_invoice(invoice: String) -> Result<()> {
    RUNTIME
        .block_on(async {
            tracing::info!("calling generate_invoice");
            let federation = get_fed().await;
            let invoice: Invoice = invoice.parse().unwrap();
            federation.pay_invoice(&invoice).await
        })
        .map_err(FedimintError::OtherError)
}

pub fn fedimint_balance() -> u64 {
    RUNTIME.block_on(async {
        tracing::info!("calling balance");
        let federation = get_fed().await;
        tracing::info!("got fed");
        federation.client.fetch_all_coins().await;
        tracing::info!("fetching coins");
        let balance = hacky_millisat_to_sat(federation.client.coins().total_amount().milli_sat);
        tracing::info!("balance {}", balance);
        balance
    })
}

pub fn fedimint_generate_address() -> String {
    RUNTIME.block_on(async {
        let federation = get_fed().await;
        let address = federation.generate_address();
        address.to_string()
    })
}

pub fn fedimint_pay_address(address: String, amount: String) -> Result<String> {
    RUNTIME.block_on(async {
        let federation = get_fed().await;
        let amount: u64 = amount.parse().unwrap();
        let amount = bitcoin::Amount::from_sat(amount);
        let address = bitcoin::util::address::Address::from_str(&address)
            .map_err(|_| FedimintError::OtherError(anyhow!("Invalid address")))?;
        let mut rng = rand::rngs::OsRng;
        let peg_out = federation
            .client
            .new_peg_out_with_fees(amount, address)
            .await
            .map_err(|e| anyhow!(e.to_string()))?;
        let out_point = federation
            .client
            .peg_out(peg_out, &mut rng)
            .await
            .map_err(|e| anyhow!(e.to_string()))?;
        federation
            .client
            .wallet_client()
            .await_peg_out_outcome(out_point)
            .await
            .map_err(|e| anyhow!(e.to_string()))?;
        federation.update_balance().await;
        federation.save_transaction(&Transaction::new(true, amount.to_sat() * 1000));
        Ok(out_point.txid.to_string())
    })
}

/// Sends events to iOS / Android layer
pub trait EventSink: Send + Sync + 'static {
    /// Send event. Body is JSON-serialized
    // fn event(&self, event: Event, body: String);
    fn event(&self, event_type: String, body: String);
}

/// Wrapper around EventSink which JSON serializes messages. This is more ergonomic in Swift / Kotlin
/// than code-generated enums, and RCTEventEmitter has the same arguments.
pub struct EventSinkWrapper {
    event_sink: Box<dyn EventSink>,
}

impl EventSinkWrapper {
    fn event(&self, event: &Event) {
        match event {
            Event::Balance { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("balance".into(), body);
            }
            Event::ReceivedLightning { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("receivedLightning".into(), body);
            }
            Event::ReceivedBitcoin { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("receivedBitcoin".into(), body);
            }
            Event::Log { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("log".into(), body);
            }
        };
    }
}
