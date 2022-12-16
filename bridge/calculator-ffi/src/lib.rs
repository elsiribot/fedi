pub mod bridge;
pub mod event;
pub mod logging;
pub mod payment;
pub mod tx;
pub mod types;

use std::{path::PathBuf, str::FromStr, sync::Arc};

use event::EventSink;
use fedimint_api::{Amount, TieredMulti};
use lazy_static::lazy_static;

uniffi_macros::include_scaffolding!("calculator");

use anyhow::anyhow;
use bridge::{Bridge, Federation};
use lightning_invoice::Invoice;
use logging::init_logging;
use mint_client::mint::SpendableNote;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::Mutex;
use tx::{IncomingBitcoinTransactionStatus, Transaction};
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
pub struct UpdateTransactionNotePayload {
    federation_id: String,
    transaction_id: String,
    notes: String,
}

async fn handle_update_transaction_notes(payload: String) -> anyhow::Result<String> {
    let payload: UpdateTransactionNotePayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    federation
        .update_transaction_notes(payload.transaction_id, payload.notes)
        .await?;
    Ok(json!({ "result": () }).to_string())
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

    bridge.join_federation(federation.clone()).await;

    let fedimint_federation = FedimintFederation::from(&federation);
    Ok(json!({ "result": fedimint_federation }).to_string())
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
    amount: Amount,
    description: String,
}

async fn handle_generate_invoice(payload: String) -> anyhow::Result<String> {
    let payload: GenerateInvoicePayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let invoice = federation
        .generate_invoice(payload.amount, payload.description)
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
pub struct GenerateEcashPayload {
    federation_id: String,
    amount: Amount,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWithAmount {
    amount: Amount,
    // FIXME: spendable_note
    note: SpendableNote,
}

async fn handle_generate_ecash(payload: String) -> anyhow::Result<String> {
    let GenerateEcashPayload {
        federation_id,
        amount,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await;
    let rng = rand::rngs::OsRng;
    let ecash: Vec<NoteWithAmount> = federation
        .client
        .spend_ecash(amount, rng)
        .await?
        .iter_items()
        .map(|(amount, note)| NoteWithAmount {
            amount,
            note: note.clone(),
        })
        .collect();
    // TODO: this should be serialized with Encodable, not Serializable
    let ecash = serde_json::to_string(&ecash).unwrap();
    federation
        .save_transaction(&Transaction::offline(
            tx::TransactionDirection::Send,
            amount,
        ))
        .await;
    Ok(json!({ "result": ecash }).to_string())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReceiveEcashPayload {
    federation_id: String,
    ecash: Vec<NoteWithAmount>,
}

async fn handle_receive_ecash(payload: String) -> anyhow::Result<String> {
    let ReceiveEcashPayload {
        federation_id,
        ecash,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await;
    let rng = rand::rngs::OsRng;
    let input = ecash.iter().map(|nwa| (nwa.amount, nwa.note.clone()));
    let tiered_multi = TieredMulti::from_iter(input);
    federation.client.reissue(tiered_multi.clone(), rng).await?;
    federation
        .save_transaction(&Transaction::offline(
            tx::TransactionDirection::Receive,
            tiered_multi.total_amount(),
        ))
        .await;
    Ok(json!({ "result": { "amount": tiered_multi.total_amount() } }).to_string())
}

// FIXME: this is the same as ReceiveOfflinePayload ...
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateEcashPayload {
    federation_id: String,
    ecash: Vec<NoteWithAmount>,
}

async fn handle_validate_ecash(payload: String) -> anyhow::Result<String> {
    let ValidateEcashPayload {
        federation_id,
        ecash,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await;
    let input = ecash.iter().map(|nwa| (nwa.amount, nwa.note.clone()));
    let tiered_multi = TieredMulti::from_iter(input);
    let valid = federation
        .client
        .validate_note_signatures(&tiered_multi)
        .await
        .is_ok();
    let amount = tiered_multi.total_amount();
    Ok(json!({ "result": { "valid": valid, "amount": amount }}).to_string())
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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PayAddressPayload {
    federation_id: String,
    address: String,
    // TODO: parse this as bitcoin::Amount
    sats: u64,
}

async fn handle_pay_address(payload: String) -> anyhow::Result<String> {
    let payload: PayAddressPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await;
    let address = bitcoin::util::address::Address::from_str(&payload.address)
        .map_err(|_| FedimintError::OtherError(anyhow!("Invalid address")))?;
    let mut rng = rand::rngs::OsRng;
    let sats = bitcoin::Amount::from_sat(payload.sats);
    let peg_out = federation
        .client
        .new_peg_out_with_fees(sats, address.clone())
        .await
        .map_err(|e| anyhow!(e.to_string()))?;
    let out_point = federation
        .client
        .peg_out(peg_out.clone(), &mut rng)
        .await
        .map_err(|e| anyhow!(e.to_string()))?;
    let txid = federation
        .client
        .wallet_client()
        .await_peg_out_outcome(out_point)
        .await
        .map_err(|e| anyhow!(e.to_string()))?;
    federation.update_balance().await;
    let fee = Some(fedimint_api::Amount::from(peg_out.fees.amount()));
    let amount = fedimint_api::Amount::from(sats);
    let outgoing_status = Some(IncomingBitcoinTransactionStatus::Pending);
    federation
        .save_transaction(&Transaction::bitcoin(
            tx::TransactionDirection::Send,
            amount,
            fee,
            address,
            txid,
            outgoing_status,
        ))
        .await;
    Ok(json!({ "result": out_point.txid.to_string() }).to_string())
}

pub fn fedimint_rpc(method: String, payload: String) -> String {
    RUNTIME.block_on(async {
        let result = match method.as_ref() {
            "listTransactions" => handle_list_transactions(payload).await,
            "updateTransactionNotes" => handle_update_transaction_notes(payload).await,
            "joinFederation" => handle_join_federation(payload).await,
            "listFederations" => handle_list_federations().await,
            "generateInvoice" => handle_generate_invoice(payload).await,
            "decodeInvoice" => handle_decode_invoice(payload).await,
            "payInvoice" => handle_pay_invoice(payload).await,
            "generateAddress" => handle_generate_address(payload).await,
            "payAddress" => handle_pay_address(payload).await,
            "generateEcash" => handle_generate_ecash(payload).await,
            "receiveEcash" => handle_receive_ecash(payload).await,
            "validateEcash" => handle_validate_ecash(payload).await,
            other => Err(anyhow::anyhow!(format!(
                "Unrecognized RPC command: {}",
                other
            ))),
        };
        return result.unwrap_or_else(|e| rpc_error(&e.to_string()));
    })
}
