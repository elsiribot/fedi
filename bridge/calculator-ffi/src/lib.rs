pub mod bridge;
pub mod event;
pub mod logging;
pub mod mnemonic;
pub mod payment;
pub mod recovery;
pub mod tx;
pub mod types;

use std::{fs, path::PathBuf, str::FromStr, sync::Arc};

use bitcoin::{secp256k1::Message, Address};
use event::{EventSink, SocialRecoveryEvent};
use fedi_social::common::RecoveryId;
use fedimint_api::{Amount, TieredMulti};
use lazy_static::lazy_static;

uniffi_macros::include_scaffolding!("calculator");

use anyhow::{anyhow, Context};
use bridge::{Bridge, Federation, RECOVERY_FILENAME};
use lightning_invoice::Invoice;
use logging::init_logging;
use mint_client::{mint::SpendableNote, social::RecoveryFile};
use mnemonic::Mnemonic;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::Mutex;
use tracing::{debug, info, metadata::LevelFilter};
use tx::{IncomingBitcoinTransactionStatus, Transaction};
use types::{BridgeLightningGateway, FedimintFederation};

use crate::{event::EventSinkWrapper, types::federation_to_fedimint_federation};

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

async fn set_bridge(bridge: Bridge) -> anyhow::Result<()> {
    tracing::debug!("resetting bridge");
    if let Some(b) = BRIDGE.lock().await.clone() {
        b.stop_pollers().await.context("couldn't stop pollers")?;
    }
    *BRIDGE.lock().await = Some(Arc::new(bridge));
    tracing::debug!("reset bridge");
    Ok(())
}

async fn get_bridge() -> anyhow::Result<Arc<Bridge>> {
    tracing::debug!("getting bridge");
    let bridge = BRIDGE.lock().await.clone().context("bridge not set")?;
    tracing::debug!("got bridge");
    Ok(bridge)
}

// TODO: send error message
pub fn fedimint_initialize(data_dir: String, log_level: String, event_sink: Box<dyn EventSink>) {
    let log_level = LevelFilter::from_str(&log_level).unwrap_or(LevelFilter::INFO);
    RUNTIME.block_on(async {
        fedimint_initialize_async(data_dir, log_level, event_sink).await;
    })
}

async fn fedimint_initialize_async(
    data_dir: String,
    log_level: LevelFilter,
    event_sink: Box<dyn EventSink>,
) -> anyhow::Result<()> {
    let data_dir = PathBuf::from(data_dir);
    let event_sink = Arc::new(EventSinkWrapper { event_sink });
    init_logging(&data_dir, event_sink.clone(), log_level)?;
    tracing::info!("init called ...");

    let bridge = Bridge::new(data_dir, event_sink.clone())
        .await
        .context("could not create a bridge")?;

    set_bridge(bridge).await?;
    Ok(())
}

fn rpc_error(description: &str) -> String {
    return json!({ "error": description }).to_string();
}

async fn get_federation(federation_id: &str) -> anyhow::Result<Arc<Federation>> {
    let bridge = get_bridge().await?;
    bridge
        .get_federation(federation_id)
        .await
        .context("could not find federation")
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTransactionsPayload {
    federation_id: String,
}

async fn handle_list_transactions(payload: String) -> anyhow::Result<String> {
    let payload: ListTransactionsPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await?;
    // FIXME: consider mapping from millisat to sat
    let transactions = federation.list_transactions().await;
    Ok(json!({ "result": transactions }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&payload.federation_id).await?;
    federation
        .update_transaction_notes(payload.transaction_id, payload.notes)
        .await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinFederationPayload {
    connect_string: String,
}

async fn handle_join_federation(payload: String) -> anyhow::Result<String> {
    let JoinFederationPayload { connect_string } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let bridge = get_bridge().await?;

    let federation = bridge.join_federation(connect_string).await?;

    let fedimint_federation = federation_to_fedimint_federation(&Arc::new(federation)).await;
    Ok(json!({ "result": fedimint_federation }).to_string())
}

async fn handle_list_federations() -> anyhow::Result<String> {
    let bridge = get_bridge().await?;
    let federations: Vec<FedimintFederation> = futures::future::join_all(
        bridge
            .federations
            .lock()
            .await
            .values()
            .map(|federation| federation_to_fedimint_federation(federation)),
    )
    .await;
    Ok(json!({ "result": federations }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&payload.federation_id).await?;
    let invoice = federation
        .generate_invoice(payload.amount, payload.description)
        .await?;
    Ok(json!({ "result": invoice.to_string() }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&payload.federation_id).await?;
    let invoice: Invoice = payload.invoice.parse().context("could not parse invoice")?;
    federation.pay_invoice(&invoice).await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddressOrInvoicePayload {
    federation_id: String,
    input: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum AddressOrInvoice {
    Address,
    Invoice,
}

async fn handle_address_or_invoice(payload: String) -> anyhow::Result<String> {
    let AddressOrInvoicePayload {
        federation_id,
        input,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    if let Ok(invoice) = input.parse::<Invoice>() {
        // validate that we can pay this invoice
        federation.can_pay_invoice(&invoice).await?;
        return Ok(json!({ "result": AddressOrInvoice::Invoice }).to_string());
    }
    if let Ok(address) = input.parse::<Address>() {
        // validate that we can pay this invoice
        federation.can_pay_address(&address)?;
        return Ok(json!({ "result": AddressOrInvoice::Address }).to_string());
    }
    Err(anyhow!("Not an address or invoice"))
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateAddressPayload {
    federation_id: String,
}

async fn handle_generate_address(payload: String) -> anyhow::Result<String> {
    let payload: GenerateAddressPayload = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&payload.federation_id).await?;
    let address = federation.generate_address().await;
    Ok(json!({ "result": address.to_string() }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&federation_id).await?;
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
    let ecash = serde_json::to_string(&ecash).context("could not serialize")?;
    federation
        .save_transaction(&Transaction::offline(
            tx::TransactionDirection::Send,
            amount,
        ))
        .await;
    Ok(json!({ "result": ecash }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&federation_id).await?;
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
#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&federation_id).await?;
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

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
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
    let federation = get_federation(&payload.federation_id).await?;
    let address = bitcoin::util::address::Address::from_str(&payload.address)
        .map_err(|_| FedimintError::OtherError(anyhow!("Invalid address")))?;
    federation.can_pay_address(&address)?;
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
    federation.send_federation_notification().await;
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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LnurlSignMessagePayload {
    /// hex-encoded message
    message: String,
    federation_id: String,
}

async fn handle_lnurl_sign_message(payload: String) -> anyhow::Result<String> {
    let LnurlSignMessagePayload {
        message,
        federation_id,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Ok(rpc_error("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    let message = Message::from_slice(&hex::decode(message)?)?;
    let signed_message = federation.sign_lnurl_message(&message);
    Ok(json!({ "result": signed_message }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGatewaysPayload {
    federation_id: String,
}

async fn handle_list_gateways(payload: String) -> anyhow::Result<String> {
    let ListGatewaysPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    let gateways = federation.client.fetch_registered_gateways().await?;
    let active_gateway = match federation.client.fetch_active_gateway().await {
        Ok(gw) => Some(gw),
        Err(_) => None,
    };
    let bridge_gateways: Vec<BridgeLightningGateway> = gateways
        .into_iter()
        .map(|gw| BridgeLightningGateway {
            api: gw.api.to_string(),
            node_pub_key: gw.node_pub_key,
            mint_pub_key: gw.mint_pub_key,
            active: active_gateway == Some(gw),
        })
        .collect();
    Ok(json!({ "result": bridge_gateways }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwitchGatewayPayload {
    federation_id: String,
    node_pubkey: bitcoin::secp256k1::PublicKey,
}

async fn handle_switch_gateway(payload: String) -> anyhow::Result<String> {
    let SwitchGatewayPayload {
        federation_id,
        node_pubkey,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    federation
        .client
        .switch_active_gateway(Some(node_pubkey))
        .await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetMnemonicPayload {
    federation_id: String,
}

async fn handle_get_mnemonic(payload: String) -> anyhow::Result<String> {
    let GetMnemonicPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    let mnemonic = federation.get_mnemonic().await;
    Ok(json!({ "result": mnemonic.serialize() }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoverFromMnemonicPayload {
    federation_id: String,
    mnemonic: Vec<String>,
}

async fn handle_recover_from_mnemonic(payload: String) -> anyhow::Result<String> {
    let RecoverFromMnemonicPayload {
        federation_id,
        mnemonic,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };

    let bridge = get_bridge().await?;
    let mnemonic_string = mnemonic.join(" ");
    // FIXME: should this happen inside bridge module?
    let mnemonic = Mnemonic::parse(mnemonic_string)?;
    let username = bridge
        .recover_from_mnemonic(&federation_id, &mnemonic)
        .await?;
    Ok(json!({ "result": username }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaveFederationPayload {
    federation_id: String,
}

async fn handle_leave_federation(payload: String) -> anyhow::Result<String> {
    let LeaveFederationPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let bridge = get_bridge().await?;
    bridge.leave_federation(&federation_id).await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadBackupFilePayload {
    federation_id: String,
    video_file_path: PathBuf,
}

async fn handle_upload_backup_file(payload: String) -> anyhow::Result<String> {
    let UploadBackupFilePayload {
        video_file_path,
        federation_id,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let datadir = { get_bridge().await?.data_dir.clone() };
    let federation = get_federation(&federation_id).await?;
    let recovery_file_path = federation
        .upload_backup_file(&video_file_path, &datadir)
        .await?;
    Ok(json!({ "result": recovery_file_path }).to_string())
}

// This method is a bit of a stopgap ...
async fn handle_locate_recovery_file(_payload: String) -> anyhow::Result<String> {
    let datadir = get_bridge().await?.data_dir.clone();
    let recovery_file_path = datadir.join(RECOVERY_FILENAME);
    Ok(json!({ "result": recovery_file_path }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateRecoveryFilePayload {
    federation_id: String,
    path: PathBuf,
}

async fn handle_validate_recovery_file(payload: String) -> anyhow::Result<String> {
    let ValidateRecoveryFilePayload {
        path,
        federation_id,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let contents = fs::read(path)?;
    // TODO: check that the federation matches and everything
    // also fixed by using federation-specific location
    let valid = match RecoveryFile::from_bytes(&contents) {
        Ok(recovery_file) => {
            let federation = get_federation(&federation_id).await?;
            federation.start_social_recovery(&recovery_file).await?;
            info!("social recovery started");
            true
        }
        Err(_) => false,
    };
    Ok(json!({ "result": valid }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryQrPayload {
    federation_id: String,
}

// FIXME: maybe this would better be called "begin_social_recovery"
async fn handle_recovery_qr(payload: String) -> anyhow::Result<String> {
    let RecoveryQrPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    // Get the recovery file from disk (React Native and handle_upload_backup_file put it there)
    let recovery_file_path = get_bridge().await?.data_dir.join(RECOVERY_FILENAME);
    let contents = fs::read(recovery_file_path)?;
    let recovery_file = RecoveryFile::from_bytes(&contents)?;

    // Return QR code contents
    let federation = get_federation(&federation_id).await?;
    let qr = federation.social_recovery_qr(&recovery_file).await?;
    Ok(json!({ "result": qr }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialRecoveryApprovalsPayload {
    federation_id: String,
}

async fn handle_social_recovery_approvals(payload: String) -> anyhow::Result<String> {
    let SocialRecoveryApprovalsPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    // Return QR code contents
    let federation = get_federation(&federation_id).await?;
    let (approvals, remaining) = federation.social_recovery_approvals().await?;
    let result = SocialRecoveryEvent {
        federation_id,
        approvals,
        remaining,
    };
    Ok(json!({ "result": result }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialRecoveryDownloadVerificationDocPayload {
    federation_id: String,
    recovery_id: RecoveryId,
}

async fn handle_social_recovery_download_verification_doc(
    payload: String,
) -> anyhow::Result<String> {
    let SocialRecoveryDownloadVerificationDocPayload {
        federation_id,
        recovery_id,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let datadir = { get_bridge().await?.data_dir.clone() };
    // Return QR code contents
    let federation = get_federation(&federation_id).await?;
    let path = federation
        .social_recovery_download_verification_doc(&recovery_id, datadir)
        .await?;
    Ok(json!({ "result": path }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApproveSocialRecoveryRequestPayload {
    federation_id: String,
    recovery_id: RecoveryId,
}

async fn handle_approve_social_recovery_request(payload: String) -> anyhow::Result<String> {
    let ApproveSocialRecoveryRequestPayload {
        federation_id,
        recovery_id,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    federation
        .approve_social_recovery_request(&recovery_id)
        .await?;
    Ok(json!({ "result": () }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteSocialRecoveryPayload {
    federation_id: String,
}

async fn handle_complete_social_recovery(payload: String) -> anyhow::Result<String> {
    let CompleteSocialRecoveryPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    let mnemonic = federation.social_recovery_combine_shares().await?;
    tracing::info!("final {:?}", mnemonic.to_string());
    let bridge = get_bridge().await?;
    let username = bridge
        .recover_from_mnemonic(&federation_id, &mnemonic)
        .await?;
    Ok(json!({ "result": username }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct XmppCredentialsPayload {
    federation_id: String,
}

async fn handle_xmpp_credentials(payload: String) -> anyhow::Result<String> {
    let XmppCredentialsPayload { federation_id } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await?;
    let credentials = federation.xmpp_credentials().await;
    Ok(json!({ "result": credentials }).to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetUsernamePayload {
    federation_id: String,
    username: String,
}

async fn handle_set_username(payload: String) -> anyhow::Result<String> {
    let SetUsernamePayload {
        federation_id,
        username,
    } = match serde_json::from_str(&payload) {
        Ok(p) => p,
        Err(_) => return Err(anyhow::anyhow!("Invalid payload")),
    };
    let federation = get_federation(&federation_id).await;
    federation.set_username(username).await;
    federation.back_up_ecash_to_federation().await?;
    Ok(json!({ "result": () }).to_string())
}

pub fn fedimint_rpc(method: String, payload: String) -> String {
    RUNTIME.block_on(async {
        debug!("RPC {} {}", method, payload);
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
            "addressOrInvoice" => handle_address_or_invoice(payload).await,
            "listGateways" => handle_list_gateways(payload).await,
            "switchGateway" => handle_switch_gateway(payload).await,
            "getMnemonic" => handle_get_mnemonic(payload).await,
            "recoverFromMnemonic" => handle_recover_from_mnemonic(payload).await,
            "leaveFederation" => handle_leave_federation(payload).await,
            // social recovery
            "uploadBackupFile" => handle_upload_backup_file(payload).await,
            "locateRecoveryFile" => handle_locate_recovery_file(payload).await,
            "validateRecoveryFile" => handle_validate_recovery_file(payload).await,
            "recoveryQr" => handle_recovery_qr(payload).await,
            "socialRecoveryApprovals" => handle_social_recovery_approvals(payload).await,
            "completeSocialRecovery" => handle_complete_social_recovery(payload).await,
            "socialRecoveryDownloadVerificationDoc" => {
                handle_social_recovery_download_verification_doc(payload).await
            }
            "approveSocialRecoveryRequest" => handle_approve_social_recovery_request(payload).await,
            // authenticatino
            "lnurlSignMessage" => handle_lnurl_sign_message(payload).await,
            "xmppCredentials" => handle_xmpp_credentials(payload).await,
            "backupXmppUsername" => handle_set_username(payload).await,

            other => Err(anyhow::anyhow!(format!(
                "Unrecognized RPC command: {}",
                other
            ))),
        };
        return result.unwrap_or_else(|e| rpc_error(&e.to_string()));
    })
}

// TODO: Generate these dynamically from the
// Event enum/impl in event.rs?
pub fn fedimint_get_supported_events() -> Vec<String> {
    return vec![
        String::from("federation"),
        String::from("transaction"),
        String::from("socialRecovery"),
        String::from("recoveryFileCreation"),
        String::from("log"),
    ];
}

#[cfg(test)]
mod tests {
    use std::path;

    use fedi_social::common::VerificationDocument;
    use serde_json::Value;
    use tracing::{debug, metadata::LevelFilter};

    use crate::recovery::SocialRecoveryQr;

    use super::*;

    struct FakeEventSink(pub Vec<(String, String)>);

    impl FakeEventSink {
        fn new() -> Self {
            Self(vec![])
        }
    }

    impl EventSink for FakeEventSink {
        fn event(&self, event_type: String, body: String) {
            debug!("event {} {}", event_type, body);
            // TODO:
            // self.0.push((event_type, body));
        }
    }

    // note: logging doesn't work yet at this point
    fn create_data_dir() -> String {
        tempfile::tempdir()
            .unwrap()
            .into_path()
            .display()
            .to_string()
    }

    // fn parse_result<'a,T: Deserialize<'a>>(result: &'a String) -> T {
    //     let v: Value = serde_json::from_str(&result).unwrap();
    //     let t = v["result"].into();
    //     t
    // }

    // FIXME: make this generic
    fn get_result(result: String) -> Value {
        let v: Value = serde_json::from_str(&result).unwrap();
        v["result"].clone()
    }

    // TODO: should we return the bridge here?
    async fn setup() -> anyhow::Result<Arc<Federation>> {
        // Intialize bridge
        let event_sink = FakeEventSink::new();
        // TODO: how to grab log level from environment?
        fedimint_initialize_async(create_data_dir(), LevelFilter::INFO, Box::new(event_sink))
            .await?;

        // Join federation
        // ngrok
        // let connect_string = String::from(
        //     r#"{"members":[[2,"wss://141bc9ab1e05.ngrok.io/"],[0,"wss://4c0922043ed1.ngrok.io/"],[1,"wss://6fc418b1717c.ngrok.io/"],[3,"wss://d8589c2dac84.ngrok.io/"]]}"#,
        // );
        // local
        // let connect_string = String::from(
        //     r#"{"members":[[0,"ws://localhost:18174/"],[1,"ws://localhost:18184/"],[2,"ws://localhost:18194/"],[3,"ws://localhost:18204/"]]}"#,
        // );
        let connect_string = String::from(
            r#"{"members":[[0,"wss://alpha.regtest-1.dev.fedibtc.com/"],[1,"wss://beta.regtest-1.dev.fedibtc.com/"],[2,"wss://charlie.regtest-1.dev.fedibtc.com/"],[3,"wss://delta.regtest-1.dev.fedibtc.com/"]]}"#,
        );
        let payload = serde_json::to_string(&JoinFederationPayload { connect_string })?;
        let result = handle_join_federation(payload).await.unwrap();
        let fedimint_federation: FedimintFederation = serde_json::from_value(get_result(result))?;
        let federation = get_federation(&fedimint_federation.name).await?;

        let data_dir = get_bridge().await.unwrap().data_dir.display().to_string();
        tracing::info!(data_dir = data_dir);
        Ok(federation)
    }

    #[test]
    fn test_xmpp_credentials() -> anyhow::Result<()> {
        RUNTIME.block_on(async {
            let fed1 = setup().await?;
            let fed2 = setup().await?;
            let cred1 = fed1.xmpp_credentials().await;
            let cred2 = fed2.xmpp_credentials().await;
            // assert!(cred1.username != cred2.username);
            assert!(cred1.password != cred2.password);
            Ok(())
        })
    }

    #[test]
    fn test_leave_federation() -> anyhow::Result<()> {
        RUNTIME.block_on(async {
            let federation = setup().await?;
            let bridge = get_bridge().await.unwrap();
            {
                let federations_lock = bridge.federations.lock().await.clone();
                assert_eq!(1, federations_lock.keys().len());
                let config_exists =
                    path::Path::new(&bridge.data_dir.join(format!("{}.json", federation.id())))
                        .is_file();
                assert!(config_exists);
                let db_exists =
                    path::Path::new(&bridge.data_dir.join(format!("{}.db", federation.id())))
                        .is_dir();
                assert!(db_exists);
            }
            bridge.leave_federation(&federation.id()).await?;
            {
                let federations_lock = bridge.federations.lock().await.clone();
                assert_eq!(0, federations_lock.keys().len());
                let config_exists =
                    path::Path::new(&bridge.data_dir.join(format!("{}.json", federation.id())))
                        .is_file();
                assert!(!config_exists);
                let db_exists =
                    path::Path::new(&bridge.data_dir.join(format!("{}.db", federation.id())))
                        .is_dir();
                assert!(!db_exists);
            }
            Ok(())
        })
    }

    #[test]
    fn test_decryption_shares() -> anyhow::Result<()> {
        // https://github.com/tokio-rs/tokio/issues/2374#issuecomment-1129447716
        RUNTIME.block_on(async {
            let federation = setup().await?;

            // Get original mnemonic (for comparison later)
            let payload = serde_json::to_string(&GetMnemonicPayload {
                federation_id: federation.id(),
            })?;
            let result = handle_get_mnemonic(payload).await.unwrap();
            let words: Vec<String> = serde_json::from_value(get_result(result))?;
            let initial_mnemonic = Mnemonic::parse(words.join(" "))?;
            info!("initial mnemnoic {:?}", &words);

            // Upload backup
            let video_file_path =
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/backup.fedi");
            let video_file_contents = fs::read(&video_file_path)?;
            let payload = serde_json::to_string(&UploadBackupFilePayload {
                video_file_path,
                federation_id: federation.id(),
            })?;
            let result = handle_upload_backup_file(payload).await.unwrap();
            let recovery_file_path: String = serde_json::from_value(get_result(result)).unwrap();
            info!(recovery_file_path = recovery_file_path);

            // Validate recovery file
            let payload = serde_json::to_string(&ValidateRecoveryFilePayload {
                path: recovery_file_path.into(),
                federation_id: federation.id(),
            })?;
            let result = handle_validate_recovery_file(payload).await.unwrap();
            let valid: bool = serde_json::from_value(get_result(result)).unwrap();
            assert!(valid);

            // Get recovery_id
            let payload = serde_json::to_string(&RecoveryQrPayload {
                federation_id: federation.id(),
            })?;
            let result = handle_recovery_qr(payload).await.unwrap();
            let qr: SocialRecoveryQr = serde_json::from_value(get_result(result)).unwrap();
            let recovery_id = qr.recovery_id;

            // Guardian downloads verification doc
            let payload = serde_json::to_string(&SocialRecoveryDownloadVerificationDocPayload {
                recovery_id: recovery_id.clone(),
                federation_id: federation.id(),
            })?;
            let result = handle_social_recovery_download_verification_doc(payload)
                .await
                .unwrap();
            let verification_doc_path: PathBuf =
                serde_json::from_value(get_result(result)).unwrap();
            let contents = fs::read(verification_doc_path)?;
            let _ = VerificationDocument::from_raw(&contents);
            assert_eq!(contents, video_file_contents);

            // 3 guardians approves
            let payload = serde_json::to_string(&ApproveSocialRecoveryRequestPayload {
                recovery_id: recovery_id.clone(),
                federation_id: federation.id(),
            })?;
            for _ in 0..3 {
                handle_approve_social_recovery_request(payload.clone())
                    .await
                    .unwrap();
            }

            // Member checks approval status
            let payload = serde_json::to_string(&SocialRecoveryApprovalsPayload {
                federation_id: federation.id(),
            })?;
            handle_social_recovery_approvals(payload).await.unwrap();

            // Member combines decryption shares, loading recovered mnemonic back into their db
            let payload = serde_json::to_string(&CompleteSocialRecoveryPayload {
                federation_id: federation.id(),
            })?;
            handle_complete_social_recovery(payload).await.unwrap();

            // Check backups match (TODO: how can I make sure that they're equal b/c nothing happened?)
            let payload = serde_json::to_string(&GetMnemonicPayload {
                federation_id: federation.id(),
            })?;
            let result = handle_get_mnemonic(payload).await.unwrap();
            let words: Vec<String> = serde_json::from_value(get_result(result))?;
            let final_mnemnoic = Mnemonic::parse(words.join(" "))?;
            assert_eq!(initial_mnemonic.to_string(), final_mnemnoic.to_string());

            Ok(())
        })
    }
}
