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
use serde::Deserialize;
use serde_json::json;
use tokio::sync::Mutex;
use tx::Transaction;
use types::FedimintFederation;

use crate::event::EventSinkWrapper;

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

pub fn fedimint_init(data_dir: String, event_sink: Box<dyn EventSink>) -> () {
    RUNTIME.block_on(async {
        let event_sink = Arc::new(EventSinkWrapper { event_sink });
        init_logging(event_sink.clone());
        tracing::info!("init called ...");

        let bridge = Bridge::new(PathBuf::from(data_dir), event_sink.clone()).await;

        set_bridge(bridge).await;
    })
}

fn rpc_error(description: &str) -> String {
    return json!({ "error": description }).to_string();
}

async fn get_federation(federation_id: &str) -> Arc<Federation> {
    let bridge = get_bridge().await.expect("there should be a federation");
    let lock = bridge.clients.lock().await;
    let federation = lock.get(federation_id).unwrap(); // FIXME: don't unwrap
    federation.clone() // FIXME: don't clone
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsPayload {
    federation_id: String,
}

async fn handle_list_transactions(payload: String) -> anyhow::Result<String> {
    let payload: ListTransactionsPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    // FIXME: consider mapping from millisat to sat
    let transactions = federation.list_transactions();
    Ok(json!({ "result": transactions }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinFederationPayload {
    connect_string: String,
}

async fn handle_join_federation(payload: String) -> anyhow::Result<String> {
    let payload: JoinFederationPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let bridge = get_bridge().await.expect("bridge not initialized");
    let federation = Arc::new(
        Federation::join(
            payload.connect_string,
            bridge.data_dir.clone(),
            bridge.event_sink.clone(),
        )
        .await?,
    );

    bridge.join_federation(federation).await;

    Ok(json!({ "result": () }).to_string())
}

async fn handle_list_federations() -> anyhow::Result<String> {
    let bridge = get_bridge().await.expect("bridge not initialized");
    let federations: Vec<FedimintFederation> = bridge
        .clients
        .lock()
        .await
        .values()
        .map(|federation| FedimintFederation::from(federation))
        .collect();
    Ok(json!({ "result": federations }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateInvoicePayload {
    federation_id: String,
    amount: String,
    description: String,
}

async fn handle_generate_invoice(payload: String) -> anyhow::Result<String> {
    let payload: GenerateInvoicePayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let amount: u64 = payload.amount.parse().unwrap(); // FIXME
    let amount = Amount::from_sat(amount);
    let invoice = federation
        .generate_invoice(amount, payload.description)
        .await?;
    Ok(json!({ "result": invoice.to_string() }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayInvoicePayload {
    federation_id: String,
    invoice: String,
}

async fn handle_pay_invoice(payload: String) -> anyhow::Result<String> {
    let payload: PayInvoicePayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let invoice: Invoice = payload.invoice.parse().unwrap();
    federation.pay_invoice(&invoice).await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateAddressPayload {
    federation_id: String,
}

async fn handle_generate_address(payload: String) -> anyhow::Result<String> {
    let payload: GenerateAddressPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let address = federation.generate_address().await;
    Ok(json!({ "result": address.to_string() }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayAddressPayload {
    federation_id: String,
    address: String,
    amount: String,
}
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodeInvoicePayload {
    invoice: String,
}

async fn handle_decode_invoice(payload: String) -> anyhow::Result<String> {
    let payload: DecodeInvoicePayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    // TODO: validate the invoice (same network, haven't already paid, etc)
    let invoice: Invoice = payload.invoice.parse()?;
    let bridge_invoice = types::Invoice::try_from(&invoice)?;
    Ok(json!({ "result": bridge_invoice }).to_string())
}

async fn handle_pay_address(payload: String) -> anyhow::Result<String> {
    let payload: PayAddressPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let amount: u64 = payload.amount.parse().unwrap();
    let amount = bitcoin::Amount::from_sat(amount);
    let address = bitcoin::util::address::Address::from_str(&payload.address)
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
    federation
        .save_transaction(&Transaction::new(true, amount.to_sat() * 1000))
        .await;
    Ok(json!({ "result": out_point.txid.to_string() }).to_string())
}

pub fn fedimint_rpc(method: String, payload: String) -> String {
    RUNTIME.block_on(async {
        let result = match method.as_ref() {
            "listTransactions" => handle_list_transactions(payload).await,
            "joinFederation" => handle_join_federation(payload).await,
            "listFederations" => handle_list_federations().await,
            "generateInvoice" => handle_generate_invoice(payload).await,
            "decodeInvoice" => handle_decode_invoice(payload).await,
            "payInvoice" => handle_pay_invoice(payload).await,
            "generateAddress" => handle_generate_address(payload).await,
            "payAddress" => handle_pay_address(payload).await,
            other => Err(anyhow::anyhow!(format!(
                "Unrecognized RPC command: {}",
                other
            ))),
        };
        return result.unwrap_or_else(|e| rpc_error(&e.to_string()));
    })
}
