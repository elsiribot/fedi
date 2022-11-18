pub mod bridge;
pub mod event;
pub mod payment;
pub mod test;
pub mod tx;
pub mod types;

use std::{path::PathBuf, sync::Arc};

use fedimint_api::Amount;
use lazy_static::lazy_static;

uniffi_macros::include_scaffolding!("calculator");

use bridge::{Bridge, Federation};
use lightning_invoice::Invoice;
use mint_client::ClientError;
use test::init_logging;
use tokio::sync::Mutex;
use types::hacky_millisat_to_sat;

type Result<T> = std::result::Result<T, FedimintError>;

#[derive(Debug, thiserror::Error)]
pub enum FedimintError {
    #[error("ClientError {0}")]
    ClientError(#[from] ClientError),
    #[error("Anyhow {0}")]
    AnyhowError(#[from] anyhow::Error),
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

pub fn init(data_dir: String) -> Result<()> {
    RUNTIME.block_on(async {
        init_logging();

        let bridge = Bridge::new(PathBuf::from(data_dir));
        let federation = Federation::join(
            String::from(r#"{"members":[[0,"ws://188.166.55.8:4001"]]}"#),
            bridge.data_dir.clone(),
            bridge.sender.clone(),
        )
        .await?;
        bridge.join_federation(Arc::new(federation)).await;
        set_bridge(bridge).await;

        Ok(())
    })
}

// TODO: can we return lightning_invoice::Invoice type?
pub fn generate_invoice(amount: String, description: String) -> Result<String> {
    RUNTIME.block_on(async {
        let amount: u64 = amount.parse().unwrap(); // FIXME
        let federation = get_fed().await;
        let amount = Amount::from_sat(amount);
        let invoice = federation.generate_invoice(amount, description).await?;
        Ok(invoice.to_string())
    })
}

pub fn pay_invoice(invoice: String) -> Result<()> {
    RUNTIME
        .block_on(async {
            let federation = get_fed().await;
            let invoice: Invoice = invoice.parse().unwrap();
            federation.pay_invoice(&invoice).await
        })
        .map_err(FedimintError::AnyhowError)
}

pub fn balance() -> u64 {
    RUNTIME.block_on(async {
        let federation = get_fed().await;
        federation.client.fetch_all_coins().await;
        let balance = hacky_millisat_to_sat(federation.client.coins().total_amount().milli_sat);
        balance
    })
}
