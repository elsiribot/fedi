pub mod bridge;
pub mod event;
pub mod logging;
pub mod payment;
pub mod tx;
pub mod types;

use std::{path::PathBuf, str::FromStr, sync::Arc};

use event::EventSink;
use fedimint_api::Amount;
use lazy_static::lazy_static;

uniffi_macros::include_scaffolding!("calculator");

use anyhow::anyhow;
use bridge::{Bridge, Federation};
use lightning_invoice::Invoice;
use logging::init_logging;
use tokio::sync::Mutex;
use tx::Transaction;
use types::{hacky_millisat_to_sat, FedimintFederation};

use crate::event::EventSinkWrapper;

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

        let bridge = Bridge::new(PathBuf::from(data_dir), event_sink.clone()).await;

        set_bridge(bridge).await;

        Ok(())
    })
}

pub fn fedimint_join_federation(connect_string: String) -> Result<()> {
    RUNTIME.block_on(async {
        let bridge = get_bridge().await.expect("bridge not initialized");
        let federation = Arc::new(
            Federation::join(
                connect_string,
                bridge.data_dir.clone(),
                bridge.event_sink.clone(),
            )
            .await?,
        );

        bridge.join_federation(federation).await;

        Ok(())
    })
}

pub fn fedimint_list_federations() -> Vec<FedimintFederation> {
    RUNTIME.block_on(async {
        let bridge = get_bridge().await.expect("bridge not initialized");
        let names = bridge
            .clients
            .lock()
            .await
            .keys()
            .map(|name| FedimintFederation { name: name.clone() })
            .collect();
        names
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
        let address = federation.generate_address().await;
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
        federation.save_transaction(&Transaction::new(true, amount.to_sat() * 1000)).await;
        Ok(out_point.txid.to_string())
    })
}

// Experiment: this returns a JSON vec of transactions ...
pub fn fedimint_list_transactions() -> String {
    RUNTIME.block_on(async {
        let federation = get_fed().await;
        // FIXME: consider mapping from millisat to sat
        let transactions = federation.list_transactions();
        tracing::info!("txns: {:?}", transactions);
        serde_json::to_string(&transactions).expect("A vec of transactions is json-serializable")
    })
}
