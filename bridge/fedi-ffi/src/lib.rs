#![allow(non_snake_case)]

pub mod bridge;
pub mod error;
pub mod event;
pub mod logging;
pub mod mnemonic;
pub mod payment;
pub mod recovery;
pub mod tx;
pub mod types;

use std::{
    path::PathBuf,
    str::FromStr,
    sync::{atomic::AtomicU64, Arc},
};

use bitcoin::{secp256k1::Message, Address};
use error::ErrorCode;
use event::{EventSink, SocialRecoveryEvent};
use futures::Future;
use lazy_static::lazy_static;
use types::RecoveryId;
use types::{Amount, PeerId, PublicKey};

uniffi_macros::include_scaffolding!("fedi");

use anyhow::{anyhow, Context};
use bridge::{Bridge, Federation, RECOVERY_FILENAME};
use lightning_invoice::Invoice;
use logging::init_logging;
use macro_rules_attribute::macro_rules_derive;
use mint_client::{
    social::RecoveryFile,
    utils::{parse_ecash, serialize_ecash},
};
use mnemonic::Mnemonic;
use recovery::SocialRecoveryQr;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use tokio::fs;
use tokio::sync::Mutex;
use tracing::{error, info, info_span, Instrument};
use tx::{IncomingBitcoinTransactionStatus, Transaction};
use types::{BridgeLightningGateway, FedimintFederation, LnurlSignedMessage, XmppCredentials};

use crate::{
    error::get_error_code, event::EventSinkWrapper, types::federation_to_fedimint_federation,
};

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
    let bridge = BRIDGE
        .lock()
        .await
        .clone()
        .context(ErrorCode::InitializationFailed)?;
    tracing::debug!("got bridge");
    Ok(bridge)
}

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

async fn fedimint_initialize_async(
    data_dir: String,
    log_level: &str,
    event_sink: Box<dyn EventSink>,
) -> anyhow::Result<()> {
    let already_init = { BRIDGE.lock().await.is_some() };
    if already_init {
        anyhow::bail!("init called again, ignoring");
    }

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

fn rpc_error(error: &anyhow::Error) -> String {
    tracing::error!(%error, "rpc_error");
    let code = get_error_code(error);

    return json!({ "error": error.to_string(), "code": code }).to_string();
}

async fn get_federation(federation_id: &str) -> anyhow::Result<Arc<Federation>> {
    let bridge = get_bridge().await?;
    bridge
        .get_federation(federation_id)
        .await
        .context(ErrorCode::InitializationFailed)
}

use ts_rs::TS;

macro_rules! rpc_method {
    (
        $vis:vis async fn $name:ident (
            $(
                $arg_name:ident: $arg_ty:ty
            ),*
            $(,)?
        ) -> anyhow::Result<$ret:ty>

        $body:block
    ) => {
        mod $name {
            use super::*;
            #[derive(Debug, Serialize, Deserialize, TS)]
            #[serde(rename_all = "camelCase")]
            pub struct Args {
            $(
                pub $arg_name: $arg_ty,
            )*
            }

            pub type Return = $ret;
            pub async fn handle($name::Args { $( $arg_name ),* }: $name::Args) -> anyhow::Result<$ret> {
                super::$name($($arg_name),*).await
            }
        }

    };
}

#[macro_rules_derive(rpc_method!)]
async fn listTransactions(federation_id: String) -> anyhow::Result<Vec<Transaction>> {
    let federation = get_federation(&federation_id).await?;
    // FIXME: consider mapping from millisat to sat
    let transactions = federation.list_transactions().await;
    Ok(transactions)
}

#[macro_rules_derive(rpc_method!)]
async fn updateTransactionNotes(
    federation_id: String,
    transaction_id: String,
    notes: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&federation_id).await?;
    federation
        .update_transaction_notes(transaction_id, notes)
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn joinFederation(connect_string: String) -> anyhow::Result<FedimintFederation> {
    let bridge = get_bridge().await?;

    let federation = bridge.join_federation(connect_string).await?;

    let fedimint_federation = federation_to_fedimint_federation(&federation).await;
    Ok(fedimint_federation)
}

#[macro_rules_derive(rpc_method!)]
async fn listFederations() -> anyhow::Result<Vec<FedimintFederation>> {
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
    Ok(federations)
}

#[macro_rules_derive(rpc_method!)]
async fn generateInvoice(
    federation_id: String,
    amount: Amount,
    description: String,
) -> anyhow::Result<String> {
    if amount.0.msats > 200000000 {
        anyhow::bail!("Maximum invoice amount is 200,000 sats");
    }
    let federation = get_federation(&federation_id).await?;
    let invoice = federation.generate_invoice(amount.0, description).await?;
    Ok(invoice.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn payInvoice(federation_id: String, invoice: String) -> anyhow::Result<()> {
    let federation = get_federation(&federation_id).await?;
    let invoice: Invoice = invoice.parse().context(ErrorCode::InvalidInvoice)?;
    federation.pay_invoice(&invoice).await
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub enum AddressOrInvoice {
    Address,
    Invoice,
}

#[macro_rules_derive(rpc_method!)]
async fn addressOrInvoice(
    federation_id: String,
    input: String,
) -> anyhow::Result<AddressOrInvoice> {
    let federation = get_federation(&federation_id).await?;
    if let Ok(invoice) = input.parse::<Invoice>() {
        // validate that we can pay this invoice
        federation.can_pay_invoice(&invoice).await?;
        return Ok(AddressOrInvoice::Invoice);
    }
    if let Ok(address) = input.parse::<Address>() {
        // validate that we can pay this invoice
        federation.can_pay_address(&address)?;
        return Ok(AddressOrInvoice::Address);
    }
    Err(anyhow!("Not an address or invoice"))
}

#[macro_rules_derive(rpc_method!)]
async fn generateAddress(federation_id: String) -> anyhow::Result<String> {
    let federation = get_federation(&federation_id).await?;
    let address = federation.generate_address().await;
    Ok(address.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn generateEcash(federation_id: String, amount: Amount) -> anyhow::Result<String> {
    let federation = get_federation(&federation_id).await?;
    let ecash = federation.generate_ecash(amount.0).await?;
    let ecash = serialize_ecash(&ecash);
    Ok(ecash)
}

#[macro_rules_derive(rpc_method!)]
async fn receiveEcash(
    federation_id: String,
    // TODO : TieredMulti<SpendableNote>
    ecash: String,
) -> anyhow::Result<Amount> {
    let federation = get_federation(&federation_id).await?;
    // TODO: save them to disk in case this call fails.
    // Add a poller to check for ecash notes in the table and try to redeem them periodically.
    // If redeemed, send transaction event and update their entry.
    let ecash = parse_ecash(&ecash)?;
    Ok(Amount(federation.receive_ecash(ecash).await?))
}

#[derive(Debug, Serialize, Deserialize, TS)]
pub struct ValidateEcashResponse {
    valid: bool,
    amount: Amount,
}

#[macro_rules_derive(rpc_method!)]
async fn validateEcash(
    federation_id: String,
    // TODO: TieredMulti<SpendableNote>
    ecash: String,
) -> anyhow::Result<ValidateEcashResponse> {
    let federation = get_federation(&federation_id).await?;
    let ecash = parse_ecash(&ecash)?;
    let (valid, amount) = federation.validate_ecash(ecash).await;
    Ok(ValidateEcashResponse {
        valid,
        amount: Amount(amount),
    })
}

#[macro_rules_derive(rpc_method!)]
async fn decodeInvoice(invoice: String) -> anyhow::Result<types::Invoice> {
    // TODO: validate the invoice (same network, haven't already paid, etc)
    let invoice: Invoice = invoice.parse().context(ErrorCode::InvalidInvoice)?;
    let bridge_invoice = types::Invoice::try_from(&invoice)?;
    Ok(bridge_invoice)
}

#[macro_rules_derive(rpc_method!)]
async fn payAddress(
    federation_id: String,
    address: String,
    // TODO: parse this as bitcoin::Amount
    sats: u64,
) -> anyhow::Result<String> {
    let federation = get_federation(&federation_id).await?;
    let address = bitcoin::util::address::Address::from_str(&address)
        .map_err(|_| FedimintError::OtherError(anyhow!("Invalid address")))?;
    federation.can_pay_address(&address)?;
    let mut rng = rand::rngs::OsRng;
    let sats = bitcoin::Amount::from_sat(sats);
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
    federation.send_federation_event().await;
    let fee = Some(fedimint_api::Amount::from(peg_out.fees.amount()));
    let amount = fedimint_api::Amount::from(sats);
    let outgoing_status = Some(IncomingBitcoinTransactionStatus::Pending);
    federation
        .save_transaction(
            &Transaction::bitcoin(
                tx::TransactionDirection::Send,
                amount,
                fee,
                address,
                txid,
                outgoing_status,
            ),
            true,
        )
        .await;
    Ok(out_point.txid.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn lnurlSignMessage(
    // hex-encoded message
    message: String,
    federation_id: String,
) -> anyhow::Result<LnurlSignedMessage> {
    let federation = get_federation(&federation_id).await?;
    let message = Message::from_slice(&hex::decode(message)?)?;
    let signed_message = federation.sign_lnurl_message(&message);
    Ok(signed_message)
}

#[macro_rules_derive(rpc_method!)]
async fn listGateways(federation_id: String) -> anyhow::Result<Vec<BridgeLightningGateway>> {
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
    Ok(bridge_gateways)
}

#[macro_rules_derive(rpc_method!)]
async fn switchGateway(federation_id: String, node_pubkey: PublicKey) -> anyhow::Result<()> {
    let federation = get_federation(&federation_id).await?;
    federation
        .client
        .switch_active_gateway(Some(node_pubkey.0))
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn getMnemonic(federation_id: String) -> anyhow::Result<Vec<String>> {
    let federation = get_federation(&federation_id).await?;
    let mnemonic = federation.get_mnemonic().await;
    Ok(mnemonic.serialize())
}

#[macro_rules_derive(rpc_method!)]
async fn recoverFromMnemonic(
    federation_id: String,
    mnemonic: Vec<String>,
) -> anyhow::Result<Option<String>> {
    let bridge = get_bridge().await?;
    let mnemonic_string = mnemonic.join(" ");
    // FIXME: should this happen inside bridge module?
    let mnemonic = Mnemonic::parse(mnemonic_string).context(ErrorCode::InvalidMnemonic)?;
    let username = bridge
        .recover_from_mnemonic(&federation_id, &mnemonic)
        .await?;
    Ok(username)
}

#[macro_rules_derive(rpc_method!)]
async fn leaveFederation(federation_id: String) -> anyhow::Result<()> {
    let bridge = get_bridge().await?;
    bridge.leave_federation(&federation_id).await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn uploadBackupFile(
    federation_id: String,
    video_file_path: PathBuf,
) -> anyhow::Result<PathBuf> {
    let datadir = { get_bridge().await?.data_dir.clone() };
    let federation = get_federation(&federation_id).await?;
    let recovery_file_path = federation
        .upload_backup_file(&video_file_path, &datadir)
        .await?;
    Ok(recovery_file_path)
}

// This method is a bit of a stopgap ...
#[macro_rules_derive(rpc_method!)]
async fn locateRecoveryFile() -> anyhow::Result<PathBuf> {
    let datadir = get_bridge().await?.data_dir.clone();
    let recovery_file_path = datadir.join(RECOVERY_FILENAME);
    Ok(recovery_file_path)
}

#[macro_rules_derive(rpc_method!)]
async fn validateRecoveryFile(federation_id: String, path: PathBuf) -> anyhow::Result<bool> {
    let contents = fs::read(path).await?;
    let recovery_file = RecoveryFile::from_bytes(&contents)?;
    let federation = get_federation(&federation_id).await?;
    federation.start_social_recovery(&recovery_file).await?;
    // TODO: check that the federation matches and everything
    // also fixed by using federation-specific location
    let valid = RecoveryFile::from_bytes(&contents).is_ok();
    Ok(valid)
}

// FIXME: maybe this would better be called "begin_social_recovery"
#[macro_rules_derive(rpc_method!)]
async fn recoveryQr(federation_id: String) -> anyhow::Result<SocialRecoveryQr> {
    // Return QR code contents
    let federation = get_federation(&federation_id).await?;

    // Get the recovery file from disk (React Native and handle_upload_backup_file put it there)
    let recovery_file_path = get_bridge().await?.data_dir.join(RECOVERY_FILENAME);
    let contents = fs::read(recovery_file_path).await?;
    let recovery_file = RecoveryFile::from_bytes(&contents)?;
    // Upload verification document if none exists.
    federation.start_social_recovery(&recovery_file).await?;
    let qr = federation.social_recovery_qr().await?;
    Ok(qr)
}

#[macro_rules_derive(rpc_method!)]
async fn socialRecoveryApprovals(federation_id: String) -> anyhow::Result<SocialRecoveryEvent> {
    // Return QR code contents
    let federation = get_federation(&federation_id).await?;
    let (approvals, remaining) = federation.social_recovery_approvals().await?;
    let result = SocialRecoveryEvent {
        federation_id,
        approvals,
        remaining,
    };
    Ok(result)
}

#[macro_rules_derive(rpc_method!)]
async fn socialRecoveryDownloadVerificationDoc(
    federation_id: String,
    recovery_id: RecoveryId,
) -> anyhow::Result<Option<PathBuf>> {
    let datadir = { get_bridge().await?.data_dir.clone() };
    // Return QR code contents
    let federation = get_federation(&federation_id).await?;
    let path = federation
        .social_recovery_download_verification_doc(&recovery_id.0, datadir)
        .await?;
    Ok(path)
}

#[macro_rules_derive(rpc_method!)]
async fn approveSocialRecoveryRequest(
    federation_id: String,
    recovery_id: RecoveryId,
    peer_id: PeerId,
    password: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&federation_id).await?;
    federation
        .approve_social_recovery_request(&recovery_id.0, peer_id.0, &password)
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn completeSocialRecovery(federation_id: String) -> anyhow::Result<Option<String>> {
    let federation = get_federation(&federation_id).await?;
    let mnemonic = federation.social_recovery_combine_shares().await?;
    tracing::info!("final {:?}", mnemonic.to_string());
    let bridge = get_bridge().await?;
    let username = bridge
        .recover_from_mnemonic(&federation_id, &mnemonic)
        .await?;
    federation.delete_social_recovery_state_and_id().await;
    federation.send_federation_event().await;
    Ok(username)
}

#[macro_rules_derive(rpc_method!)]
async fn xmppCredentials(federation_id: String) -> anyhow::Result<XmppCredentials> {
    let federation = get_federation(&federation_id).await?;
    let credentials = federation.xmpp_credentials().await;
    Ok(credentials)
}

#[macro_rules_derive(rpc_method!)]
async fn backupXmppUsername(federation_id: String, username: String) -> anyhow::Result<()> {
    let federation = get_federation(&federation_id).await?;
    federation.set_username(username).await;
    federation.back_up_ecash_to_federation().await?;
    Ok(())
}

// converts from a typed handler into untyped handler
async fn handle_wrapper<Args, F, Fut, R>(f: F, payload: String) -> anyhow::Result<String>
where
    F: Fn(Args) -> Fut,
    Args: DeserializeOwned,
    Fut: Future<Output = anyhow::Result<R>>,
    R: Serialize,
{
    let args = serde_json::from_str(&payload).context(ErrorCode::BadRequest)?;
    let response = f(args).await?;
    let response = serde_json::json!({
        "result": response,
    });
    serde_json::to_string(&response).context("serialization failed")
}

macro_rules! rpc_methods {
    ($name:ident { $($method:ident),* $(,)? }) => {
        // all variants are unused
        // just used for typeshare
        #[allow(unused)]
        #[derive(TS)]
        #[ts(export, export_to = "target/bindings/")]
        pub struct $name {
        $(
            #[ts(inline)]
            $method: ($method::Args, $method::Return),
        )*
        }

        impl $name {
            pub async fn handle(method: &str, payload: String) -> anyhow::Result<String> {
                match method {
                $(
                    stringify!($method) => handle_wrapper($method::handle, payload).await,
                )*
                    other => Err(anyhow::anyhow!(format!(
                        "Unrecognized RPC command: {}",
                        other
                    ))),
                }
            }
        }
    };
}

rpc_methods!(RpcMethods {
    listTransactions,
    updateTransactionNotes,
    joinFederation,
    listFederations,
    generateInvoice,
    decodeInvoice,
    payInvoice,
    generateAddress,
    payAddress,
    generateEcash,
    receiveEcash,
    validateEcash,
    addressOrInvoice,
    listGateways,
    switchGateway,
    getMnemonic,
    recoverFromMnemonic,
    leaveFederation,
    // social
    uploadBackupFile,
    locateRecoveryFile,
    validateRecoveryFile,
    recoveryQr,
    socialRecoveryApprovals,
    completeSocialRecovery,
    socialRecoveryDownloadVerificationDoc,
    approveSocialRecoveryRequest,
    // authentication
    lnurlSignMessage,
    xmppCredentials,
    backupXmppUsername,
});

pub fn fedimint_rpc(method: String, payload: String) -> String {
    static REQUEST_ID: AtomicU64 = AtomicU64::new(0);
    let request_id = REQUEST_ID.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    tracing::info!("{} {}", method, payload);

    RUNTIME.block_on(
        async {
            info!(?payload, "rpc_payload");

            let result = RpcMethods::handle(&method, payload).await;
            let response = result.unwrap_or_else(|e| rpc_error(&e));
            info!(?response, "rpc_response");
            response
        }
        .instrument(info_span!("rpc_request", %request_id, %method)),
    )
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
        fedimint_initialize_async(create_data_dir(), "info", Box::new(event_sink))
            .await
            .unwrap_or_else(|e| error!("init failed {:?}", e));

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
        let fedimint_federation = joinFederation(connect_string).await?;
        let federation = get_federation(&fedimint_federation.name).await?;

        let data_dir = get_bridge().await.unwrap().data_dir.display().to_string();
        tracing::info!(data_dir = data_dir);
        Ok(federation)
    }

    #[test]
    #[ignore]
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
            let words = getMnemonic(federation.id()).await?;
            let initial_mnemonic = Mnemonic::parse(words.join(" "))?;
            info!("initial mnemnoic {:?}", &words);

            // Upload backup
            let video_file_path =
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/backup.fedi");
            let video_file_contents = fs::read(&video_file_path).await?;
            let recovery_file_path = uploadBackupFile(federation.id(), video_file_path).await?;
            info!(recovery_file_path = ?recovery_file_path);

            // Validate recovery file
            let valid = validateRecoveryFile(federation.id(), recovery_file_path).await?;
            assert!(valid);

            let qr = recoveryQr(federation.id()).await?;
            let recovery_id = qr.recovery_id;

            let verification_doc_path =
                socialRecoveryDownloadVerificationDoc(federation.id(), recovery_id.clone())
                    .await?
                    .unwrap();

            let contents = fs::read(verification_doc_path).await?;
            let _ = VerificationDocument::from_raw(&contents);
            assert_eq!(contents, video_file_contents);

            // 3 guardians approves
            for i in 0..3 {
                let password = match i {
                    0 => "1111",
                    1 => "2222",
                    2 => "3333",
                    3 => "4444",
                    _ => panic!("invalid peer id"),
                };
                approveSocialRecoveryRequest(
                    federation.id(),
                    recovery_id.clone(),
                    PeerId(fedimint_api::PeerId::from(i)),
                    password.into(),
                )
                .await?;
            }

            // Member checks approval status
            socialRecoveryApprovals(federation.id()).await?;

            // Member combines decryption shares, loading recovered mnemonic back into their db
            completeSocialRecovery(federation.id()).await?;

            // Check backups match (TODO: how can I make sure that they're equal b/c nothing happened?)
            let words: Vec<String> = getMnemonic(federation.id()).await?;
            let final_mnemnoic = Mnemonic::parse(words.join(" "))?;
            assert_eq!(initial_mnemonic.to_string(), final_mnemnoic.to_string());

            Ok(())
        })
    }
}
