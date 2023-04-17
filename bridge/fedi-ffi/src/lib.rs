#![allow(non_snake_case)]

pub mod bridge;
pub mod error;
pub mod event;
#[cfg(not(target_family = "wasm"))]
mod ffi;
#[cfg(not(target_family = "wasm"))]
pub mod logging;
pub mod mnemonic;
pub mod payment;
pub mod recovery;
pub mod storage;
pub mod tx;
pub mod types;

use std::{
    path::PathBuf,
    str::FromStr,
    sync::{atomic::AtomicU64, Arc},
};

use fedimint_client_fedi::RecoveryFile;
pub use fedimint_core;
pub use mint_client;
pub use tokio;

use bitcoin::{secp256k1::Message, Address};
use error::ErrorCode;
use event::{EventSink, SocialRecoveryEvent};
use futures::Future;
use storage::Storage;
use types::{Amount, PeerId, PublicKey};
use types::{FederationId, RecoveryId};

use anyhow::{anyhow, Context};
use bridge::{Bridge, Federation};
use lightning_invoice::Invoice;
use macro_rules_attribute::macro_rules_derive;
use mint_client::utils::{parse_ecash, serialize_ecash};
use mnemonic::Mnemonic;
use recovery::SocialRecoveryQr;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use tracing::{debug, error, info, instrument};
use tx::{IncomingBitcoinTransactionStatus, Transaction};
use types::{BridgeLightningGateway, FedimintFederation, LnurlSignedMessage, XmppCredentials};

use crate::{error::get_error_code, types::federation_to_fedimint_federation};

#[derive(Debug, thiserror::Error)]
pub enum FedimintError {
    #[error("{0}")]
    OtherError(#[from] anyhow::Error),
}

pub async fn fedimint_initialize_async(
    storage: Storage,
    event_sink: EventSink,
) -> anyhow::Result<Arc<Bridge>> {
    let bridge = Bridge::new(storage, event_sink)
        .await
        .context("could not create a bridge")?;
    Ok(Arc::new(bridge))
}

fn rpc_error(error: &anyhow::Error) -> String {
    tracing::error!(%error, "rpc_error");
    let code = get_error_code(error);

    return json!({ "error": error.to_string(), "code": code }).to_string();
}

// FIXME: this should be a method on Bridge???
async fn get_federation(
    bridge: &Bridge,
    federation_id: &FederationId,
) -> anyhow::Result<Arc<Federation>> {
    bridge
        .get_federation(&federation_id.0)
        .await
        .context(ErrorCode::InitializationFailed)
}

use ts_rs::TS;

macro_rules! rpc_method {
    (
        $vis:vis async fn $name:ident (
            $bridge:ident: $bridge_ty:ty
            $(
                ,$arg_name:ident: $arg_ty:ty
            )*
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
            pub async fn handle($bridge: $bridge_ty, $name::Args { $( $arg_name ),* }: $name::Args) -> anyhow::Result<$ret> {
                super::$name($bridge, $($arg_name),*).await
            }
        }

    };
}

#[macro_rules_derive(rpc_method!)]
async fn listTransactions(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Vec<Transaction>> {
    let federation = get_federation(&bridge, &federation_id).await?;
    // FIXME: consider mapping from millisat to sat
    let transactions = federation.list_transactions().await;
    Ok(transactions)
}

#[macro_rules_derive(rpc_method!)]
async fn updateTransactionNotes(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    transaction_id: String,
    notes: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&bridge, &federation_id).await?;
    federation
        .update_transaction_notes(transaction_id, notes)
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn joinFederation(
    bridge: Arc<Bridge>,
    connect_string: String,
) -> anyhow::Result<FedimintFederation> {
    info!("joining federation {:?}", connect_string);
    if let Err(e) = bridge.join_federation(connect_string.clone()).await {
        info!("joinfederation result {:?}", e);
    };
    let federation = bridge.join_federation(connect_string).await?;

    let fedimint_federation = federation_to_fedimint_federation(&federation).await;
    Ok(fedimint_federation)
}

#[macro_rules_derive(rpc_method!)]
async fn listFederations(bridge: Arc<Bridge>) -> anyhow::Result<Vec<FedimintFederation>> {
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
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    amount: Amount,
    description: String,
) -> anyhow::Result<String> {
    if amount.0.msats > 200000000 {
        anyhow::bail!("Maximum invoice amount is 200,000 sats");
    }
    let federation = get_federation(&bridge, &federation_id).await?;
    let invoice = federation.generate_invoice(amount.0, description).await?;
    Ok(invoice.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn payInvoice(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    invoice: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&bridge, &federation_id).await?;
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
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    input: String,
) -> anyhow::Result<AddressOrInvoice> {
    let federation = get_federation(&bridge, &federation_id).await?;
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
async fn generateAddress(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<String> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let address = federation.generate_address().await;
    Ok(address.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn generateEcash(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    amount: Amount,
) -> anyhow::Result<String> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let ecash = federation.generate_ecash(amount.0).await?;
    let ecash = serialize_ecash(&ecash);
    Ok(ecash)
}

#[macro_rules_derive(rpc_method!)]
async fn receiveEcash(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    // TODO : TieredMulti<SpendableNote>
    ecash: String,
) -> anyhow::Result<Amount> {
    let federation = get_federation(&bridge, &federation_id).await?;
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
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    // TODO: TieredMulti<SpendableNote>
    ecash: String,
) -> anyhow::Result<ValidateEcashResponse> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let ecash = parse_ecash(&ecash)?;
    let (valid, amount) = federation.validate_ecash(ecash).await;
    Ok(ValidateEcashResponse {
        valid,
        amount: Amount(amount),
    })
}

#[macro_rules_derive(rpc_method!)]
async fn decodeInvoice(_bridge: Arc<Bridge>, invoice: String) -> anyhow::Result<types::Invoice> {
    // TODO: validate the invoice (same network, haven't already paid, etc)
    let invoice: Invoice = invoice.parse().context(ErrorCode::InvalidInvoice)?;
    let bridge_invoice = types::Invoice::try_from(&invoice)?;
    Ok(bridge_invoice)
}

#[macro_rules_derive(rpc_method!)]
async fn payAddress(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    address: String,
    // TODO: parse this as bitcoin::Amount
    sats: u64,
) -> anyhow::Result<String> {
    let federation = get_federation(&bridge, &federation_id).await?;
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
    let fee = Some(fedimint_core::Amount::from(peg_out.fees.amount()));
    let amount = fedimint_core::Amount::from(sats);
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
    bridge: Arc<Bridge>,
    // hex-encoded message
    message: String,
    federation_id: FederationId,
) -> anyhow::Result<LnurlSignedMessage> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let message = Message::from_slice(&hex::decode(message)?)?;
    let signed_message = federation.sign_lnurl_message(&message);
    Ok(signed_message)
}

#[macro_rules_derive(rpc_method!)]
async fn listGateways(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Vec<BridgeLightningGateway>> {
    let federation = get_federation(&bridge, &federation_id).await?;
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
async fn switchGateway(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    node_pubkey: PublicKey,
) -> anyhow::Result<()> {
    let federation = get_federation(&bridge, &federation_id).await?;
    federation
        .client
        .switch_active_gateway(Some(node_pubkey.0))
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn getMnemonic(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Vec<String>> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let mnemonic = federation.get_mnemonic().await;
    Ok(mnemonic.serialize())
}

#[macro_rules_derive(rpc_method!)]
async fn recoverFromMnemonic(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    mnemonic: Vec<String>,
) -> anyhow::Result<Option<String>> {
    let mnemonic_string = mnemonic.join(" ");
    // FIXME: should this happen inside bridge module?
    let mnemonic = Mnemonic::parse(mnemonic_string).context(ErrorCode::InvalidMnemonic)?;
    let username = bridge
        .recover_from_mnemonic(&federation_id.0, &mnemonic)
        .await?;
    Ok(username)
}

#[macro_rules_derive(rpc_method!)]
async fn leaveFederation(bridge: Arc<Bridge>, federation_id: FederationId) -> anyhow::Result<()> {
    bridge.leave_federation(&federation_id.0).await?;
    Ok(())
}

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

#[macro_rules_derive(rpc_method!)]
async fn uploadBackupFile(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    video_file_path: PathBuf,
) -> anyhow::Result<PathBuf> {
    let storage = bridge.storage.clone();
    let federation = get_federation(&bridge, &federation_id).await?;
    debug!("uploading backup file {:?}", video_file_path);
    let video_file = storage.read_file(&video_file_path).await?;

    let recovery_file = federation.upload_backup_file(video_file).await?;

    storage
        .write_file(RECOVERY_FILENAME.as_ref(), recovery_file)
        .await?;
    Ok(storage.platform_path(RECOVERY_FILENAME.as_ref()))
}

// This method is a bit of a stopgap ...
#[macro_rules_derive(rpc_method!)]
async fn locateRecoveryFile(bridge: Arc<Bridge>) -> anyhow::Result<PathBuf> {
    let storage = bridge.storage.clone();
    Ok(storage.platform_path(RECOVERY_FILENAME.as_ref()))
}

#[macro_rules_derive(rpc_method!)]
async fn validateRecoveryFile(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    path: PathBuf,
) -> anyhow::Result<bool> {
    let storage = bridge.storage.clone();
    let contents = storage.read_file(&path).await?;
    let recovery_file = RecoveryFile::from_bytes(&contents)?;
    let federation = get_federation(&bridge, &federation_id).await?;
    federation.start_social_recovery(&recovery_file).await?;
    // TODO: check that the federation matches and everything
    // also fixed by using federation-specific location
    let valid = RecoveryFile::from_bytes(&contents).is_ok();
    Ok(valid)
}

// FIXME: maybe this would better be called "begin_social_recovery"
#[macro_rules_derive(rpc_method!)]
async fn recoveryQr(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<SocialRecoveryQr> {
    // Return QR code contents
    let federation = get_federation(&bridge, &federation_id).await?;

    // Get the recovery file from disk (React Native and handle_upload_backup_file put it there)
    let storage = bridge.storage.clone();
    let contents = storage.read_file(RECOVERY_FILENAME.as_ref()).await?;
    let recovery_file = RecoveryFile::from_bytes(&contents)?;
    // Upload verification document if none exists.
    federation.start_social_recovery(&recovery_file).await?;
    let qr = federation.social_recovery_qr().await?;
    Ok(qr)
}

#[macro_rules_derive(rpc_method!)]
async fn socialRecoveryApprovals(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<SocialRecoveryEvent> {
    // Return QR code contents
    let federation = get_federation(&bridge, &federation_id).await?;
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
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    recovery_id: RecoveryId,
) -> anyhow::Result<Option<PathBuf>> {
    let storage = bridge.storage.clone();
    // Return QR code contents
    let federation = get_federation(&bridge, &federation_id).await?;

    let verification_doc = federation
        .social_recovery_download_verification_doc(&recovery_id.0)
        .await?;

    if let Some(verification_doc) = verification_doc {
        storage
            .write_file(VERIFICATION_FILENAME.as_ref(), verification_doc)
            .await?;
        tracing::info!("saved verificaiton doc");
        Ok(Some(storage.platform_path(VERIFICATION_FILENAME.as_ref())))
    } else {
        Ok(None)
    }
}

#[macro_rules_derive(rpc_method!)]
async fn approveSocialRecoveryRequest(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    recovery_id: RecoveryId,
    peer_id: PeerId,
    password: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&bridge, &federation_id).await?;
    federation
        .approve_social_recovery_request(&recovery_id.0, peer_id.0, &password)
        .await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn completeSocialRecovery(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Option<String>> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let mnemonic = federation.social_recovery_combine_shares().await?;
    tracing::info!("final {:?}", mnemonic.to_string());
    let username = bridge
        .recover_from_mnemonic(&federation_id.0, &mnemonic)
        .await?;
    federation.delete_social_recovery_state_and_id().await;
    federation.send_federation_event().await;
    Ok(username)
}

#[macro_rules_derive(rpc_method!)]
async fn xmppCredentials(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<XmppCredentials> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let credentials = federation.xmpp_credentials().await;
    Ok(credentials)
}

#[macro_rules_derive(rpc_method!)]
async fn backupXmppUsername(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    username: String,
) -> anyhow::Result<()> {
    let federation = get_federation(&bridge, &federation_id).await?;
    federation.set_username(username).await;
    federation.back_up_ecash_to_federation().await?;
    Ok(())
}

// converts from a typed handler into untyped handler
async fn handle_wrapper<Args, F, Fut, R>(
    f: F,
    bridge: Arc<Bridge>,
    payload: String,
) -> anyhow::Result<String>
where
    F: Fn(Arc<Bridge>, Args) -> Fut,
    Args: DeserializeOwned,
    Fut: Future<Output = anyhow::Result<R>>,
    R: Serialize,
{
    let args = serde_json::from_str(&payload).context(ErrorCode::BadRequest)?;
    let response = f(bridge, args).await?;
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
            pub async fn handle(bridge: Arc<Bridge>, method: &str, payload: String) -> anyhow::Result<String> {
                match method {
                $(
                    stringify!($method) => handle_wrapper($method::handle, bridge, payload).await,
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

#[instrument(
    name = "fedimint_rpc_request",
    skip(bridge, payload),
    fields(
        request_id = %{
            static REQUEST_ID: AtomicU64 = AtomicU64::new(0);
            REQUEST_ID.fetch_add(1, std::sync::atomic::Ordering::SeqCst)
        }
    )
)]
pub async fn fedimint_rpc_async(bridge: Arc<Bridge>, method: String, payload: String) -> String {
    info!(?payload, "rpc_payload");

    let result = RpcMethods::handle(bridge, &method, payload).await;
    let response = result.unwrap_or_else(|e| rpc_error(&e));
    info!(?response, "rpc_response");
    response
}

#[cfg(test)]
mod tests {
    use std::path;

    use fedi_social_client::common::VerificationDocument;
    use fedimint_logging::TracingSetup;
    use tracing::debug;

    use crate::{
        event::IEventSink,
        ffi::{PathBasedStorage, RUNTIME},
    };

    use super::*;

    struct FakeEventSink(pub Vec<(String, String)>);

    impl FakeEventSink {
        fn new() -> Self {
            Self(vec![])
        }
    }

    impl IEventSink for FakeEventSink {
        fn event(&self, event_type: String, body: String) {
            debug!("event {} {}", event_type, body);
            // TODO:
            // self.0.push((event_type, body));
        }
    }
    // pub trait IEventSink: MaybeSend + MaybeSync + 'static {
    //     /// Send event. Body is JSON-serialized
    //     fn event(&self, event_type: String, body: String);
    // }

    // note: logging doesn't work yet at this point
    fn create_data_dir() -> PathBuf {
        tempfile::tempdir().unwrap().into_path()
    }

    // fn parse_result<'a,T: Deserialize<'a>>(result: &'a String) -> T {
    //     let v: Value = serde_json::from_str(&result).unwrap();
    //     let t = v["result"].into();
    //     t
    // }

    // FIXME: make this generic
    // fn get_result(result: String) -> Value {
    //     let v: Value = serde_json::from_str(&result).unwrap();
    //     v["result"].clone()
    // }

    // TODO: should we return the bridge here?
    async fn setup() -> anyhow::Result<(Arc<Bridge>, Arc<Federation>)> {
        TracingSetup::default().init()?;

        let event_sink = Arc::new(FakeEventSink::new());
        let data_dir = create_data_dir();
        let storage = Arc::new(PathBasedStorage::new(data_dir));
        let bridge = fedimint_initialize_async(storage, event_sink).await?;
        let connect_string = String::from(
            "fed115ncxwt38ezhqwx3tzzzpd7dk69xqvlj3r2q2yunh6jzw053s7s5z8jz2eqf3xfpzldg62fghlrhtgfcqwaehxw309askcurgvyh8yet8w3jhxapdxqezuer9wchxvetyd938gcewvdhk6tcckzj7y"
        );
        let fedimint_federation = joinFederation(bridge.clone(), connect_string).await?;
        let federation = get_federation(&bridge, &fedimint_federation.id).await?;
        Ok((bridge, federation))
    }

    #[test]
    fn test_join_and_leave_and_joinfederation() -> anyhow::Result<()> {
        RUNTIME.block_on(async {
            let (bridge, federation) = setup().await?;
            leaveFederation(bridge, federation.id().into()).await?;
            setup().await?;
            Ok(())
        })
    }

    #[test]
    fn test_personal_recovery() -> anyhow::Result<()> {
        RUNTIME.block_on(async {
            let (bridge, federation) = setup().await?;

            // Get original mnemonic (for comparison later)
            let words = getMnemonic(bridge.clone(), federation.id().into()).await?;
            let initial_mnemonic = Mnemonic::parse(words.join(" "))?;
            info!("initial mnemnoic {:?}", &words);

            // leaveFederation(bridge.clone(), federation.id().into()).await?;

            let _username = recoverFromMnemonic(
                bridge.clone(),
                federation.id().into(),
                initial_mnemonic
                    .to_string()
                    .split(" ")
                    .map(|s| s.to_string())
                    .collect(),
            )
            .await?;
            let words_after = getMnemonic(bridge.clone(), federation.id().into()).await?;

            assert_eq!(words, words_after);

            Ok(())
        })
    }

    // #[test]
    // fn test_xmpp_credentials() -> anyhow::Result<()> {
    //     RUNTIME.block_on(async {
    //         let fed1 = setup().await?;
    //         let fed2 = setup().await?;
    //         let cred1 = fed1.xmpp_credentials().await;
    //         let cred2 = fed2.xmpp_credentials().await;
    //         // assert!(cred1.username != cred2.username);
    //         assert!(cred1.password != cred2.password);
    //         Ok(())
    //     })
    // }

    // #[test]
    // fn test_leave_federation() -> anyhow::Result<()> {
    //     RUNTIME.block_on(async {
    //         let federation = setup().await?;
    //         let bridge = get_bridge().await.unwrap();
    //         {
    //             let federations_lock = bridge.federations.lock().await.clone();
    //             assert_eq!(1, federations_lock.keys().len());
    //             let config_exists =
    //                 path::Path::new(&bridge.data_dir.join(format!("{}.json", federation.id())))
    //                     .is_file();
    //             assert!(config_exists);
    //             let db_exists =
    //                 path::Path::new(&bridge.data_dir.join(format!("{}.db", federation.id())))
    //                     .is_dir();
    //             assert!(db_exists);
    //         }
    //         bridge.leave_federation(&federation.id()).await?;
    //         {
    //             let federations_lock = bridge.federations.lock().await.clone();
    //             assert_eq!(0, federations_lock.keys().len());
    //             let config_exists =
    //                 path::Path::new(&bridge.data_dir.join(format!("{}.json", federation.id())))
    //                     .is_file();
    //             assert!(!config_exists);
    //             let db_exists =
    //                 path::Path::new(&bridge.data_dir.join(format!("{}.db", federation.id())))
    //                     .is_dir();
    //             assert!(!db_exists);
    //         }
    //         Ok(())
    //     })
    // }

    // #[test]
    // fn test_decryption_shares() -> anyhow::Result<()> {
    //     // https://github.com/tokio-rs/tokio/issues/2374#issuecomment-1129447716
    //     RUNTIME.block_on(async {
    //         let (bridge, federation) = setup().await?;

    //         // Get original mnemonic (for comparison later)
    //         let words = getMnemonic(bridge, federation.id().into()).await?;
    //         let initial_mnemonic = Mnemonic::parse(words.join(" "))?;
    //         info!("initial mnemnoic {:?}", &words);

    //         // Upload backup
    //         let video_file_path =
    //             PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/backup.fedi");
    //         let video_file_contents = std::fs::read(&video_file_path).await?;
    //         let recovery_file_path =
    //             uploadBackupFile(bridge, federation.id(), video_file_path).await?;
    //         info!(recovery_file_path = ?recovery_file_path);

    //         // Validate recovery file
    //         let valid = validateRecoveryFile(federation.id(), recovery_file_path).await?;
    //         assert!(valid);

    //         let qr = recoveryQr(federation.id()).await?;
    //         let recovery_id = qr.recovery_id;

    //         let verification_doc_path =
    //             socialRecoveryDownloadVerificationDoc(federation.id(), recovery_id.clone())
    //                 .await?
    //                 .unwrap();

    //         let contents = fs::read(verification_doc_path).await?;
    //         let _ = VerificationDocument::from_raw(&contents);
    //         assert_eq!(contents, video_file_contents);

    //         // 3 guardians approves
    //         for i in 0..3 {
    //             let password = match i {
    //                 0 => "1111",
    //                 1 => "2222",
    //                 2 => "3333",
    //                 3 => "4444",
    //                 _ => panic!("invalid peer id"),
    //             };
    //             approveSocialRecoveryRequest(
    //                 federation.id(),
    //                 recovery_id.clone(),
    //                 PeerId(fedimint_core::PeerId::from(i)),
    //                 password.into(),
    //             )
    //             .await?;
    //         }

    //         // Member checks approval status
    //         socialRecoveryApprovals(federation.id()).await?;

    //         // Member combines decryption shares, loading recovered mnemonic back into their db
    //         completeSocialRecovery(federation.id()).await?;

    //         // Check backups match (TODO: how can I make sure that they're equal b/c nothing happened?)
    //         let words: Vec<String> = getMnemonic(federation.id()).await?;
    //         let final_mnemnoic = Mnemonic::parse(words.join(" "))?;
    //         assert_eq!(initial_mnemonic.to_string(), final_mnemnoic.to_string());

    //         Ok(())
    //     })
    // }
}
