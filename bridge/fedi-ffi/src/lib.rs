#![allow(non_snake_case)]
// Prevents rust-miniscript compilation error
#![recursion_limit = "256"]

pub mod bridge;
pub mod error;
pub mod event;
#[cfg(not(target_family = "wasm"))]
mod ffi;
#[cfg(not(target_family = "wasm"))]
pub mod logging;
pub mod payment;
pub mod recovery;
pub mod social;
pub mod storage;
pub mod tx;
pub mod types;

use std::{
    path::PathBuf,
    str::FromStr,
    sync::{atomic::AtomicU64, Arc},
    time::Duration,
};

use fedimint_bip39::Bip39RootSecretStrategy;
pub use fedimint_core;
use fedimint_core::{
    encoding::{Decodable, Encodable},
    module::registry::ModuleDecoderRegistry,
    TieredMulti,
};
use fedimint_ln_client::LightningClientExt;
use fedimint_mint_client::SpendableNote;
use social::RecoveryFile;
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

// FIXME: copied from fedimint-cli which we don't want to take as a dependency
pub fn parse_ecash(s: &str) -> anyhow::Result<TieredMulti<SpendableNote>> {
    let bytes = base64::decode(s)?;
    Ok(Decodable::consensus_decode(
        &mut std::io::Cursor::new(bytes),
        &ModuleDecoderRegistry::default(),
    )?)
}

// FIXME: copied from fedimint-cli which we don't want to take as a dependency
pub fn serialize_ecash(c: &TieredMulti<SpendableNote>) -> String {
    let mut bytes = Vec::new();
    Encodable::consensus_encode(c, &mut bytes).expect("encodes correctly");
    base64::encode(&bytes)
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
    let federation = bridge.join_federation(connect_string).await?;

    let fedimint_federation = federation_to_fedimint_federation(&federation).await?;
    Ok(fedimint_federation)
}

#[macro_rules_derive(rpc_method!)]
async fn connectionString(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<String> {
    let federation = get_federation(&bridge, &federation_id).await?;
    Ok(federation.get_connect_info().await?.to_string())
}

#[macro_rules_derive(rpc_method!)]
async fn listFederations(bridge: Arc<Bridge>) -> anyhow::Result<Vec<FedimintFederation>> {
    futures::future::join_all(
        bridge
            .federations
            .lock()
            .await
            .values()
            .map(|federation| federation_to_fedimint_federation(federation)),
    )
    .await
    .into_iter()
    .collect()
}

#[macro_rules_derive(rpc_method!)]
async fn generateInvoice(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    amount: Amount,
    description: String,
) -> anyhow::Result<String> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let (_, invoice) = federation
        .ng_generate_invoice(amount.0, description, None)
        .await?;
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
    federation.ng_pay_invoice(&invoice).await
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
        // federation.can_pay_invoice(&invoice).await?;
        return Ok(AddressOrInvoice::Invoice);
    }
    if let Ok(address) = input.parse::<Address>() {
        // validate that we can pay this invoice
        // federation.can_pay_address(&address)?;
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
    let ecash = federation.ng_generate_ecash(amount.0).await?;
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
    Ok(Amount(federation.ng_receive_ecash(ecash).await?))
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
    let ecash = fedimint_client_fedi::utils::parse_ecash(&ecash)?;
    // FIXME
    // let (valid, amount) = federation.validate_ecash(ecash).await;
    let valid = true;
    let amount = ecash.total_amount();
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
    unimplemented!()
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
    let signed_message = federation.sign_lnurl_message(&message).await;
    Ok(signed_message)
}

#[macro_rules_derive(rpc_method!)]
async fn listGateways(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Vec<BridgeLightningGateway>> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let gateways = federation.ng.fetch_registered_gateways().await?;
    let active_gateway = match federation.ng.select_active_gateway().await {
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
    federation.ng.set_active_gateway(&node_pubkey.0).await?;
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn getMnemonic(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Vec<String>> {
    let federation = get_federation(&bridge, &federation_id).await?;
    let words = federation.get_mnemonic_words().await;
    Ok(words)
}

#[macro_rules_derive(rpc_method!)]
async fn recoverFromMnemonic(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
    mnemonic: Vec<String>,
) -> anyhow::Result<Option<String>> {
    let mnemonic = mnemonic.join(" ");
    let mnemonic: bip39::Mnemonic = mnemonic.parse()?;
    let federation = bridge
        .restore_federation(federation_id.into(), mnemonic)
        .await?;
    let username = federation.get_username().await;
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
    unimplemented!()
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
    unimplemented!()
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
    unimplemented!()
}

#[macro_rules_derive(rpc_method!)]
async fn completeSocialRecovery(
    bridge: Arc<Bridge>,
    federation_id: FederationId,
) -> anyhow::Result<Option<String>> {
    unimplemented!()
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
    federation.backup().await?;
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
    connectionString,
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
    use std::sync::Once;
    use std::time::UNIX_EPOCH;
    use std::{path, time::Duration};

    use bitcoin::secp256k1::PublicKey;
    use fedi_social_client::common::VerificationDocument;
    use fedimint_logging::TracingSetup;
    use std::sync::RwLock;

    use crate::{event::IEventSink, ffi::PathBasedStorage};
    use devimint::cmd;

    use super::*;

    // TODO: make a static TestFed that lasts the entire duration of the test suite
    // this might make it easier to do these kinds of CLI commands

    async fn cli_generate_ecash() -> anyhow::Result<TieredMulti<SpendableNote>> {
        let cfg_dir = std::env::var("FM_DATA_DIR").unwrap();
        let ecash_string = cmd!(
            "fedimint-cli",
            "--data-dir={cfg_dir}",
            "ng",
            "spend",
            "10000"
        )
        .out_json()
        .await?["note"]
            .as_str()
            .map(|s| s.to_owned())
            .expect("'note' key not found generating ecash with fedimint-cli");
        parse_ecash(&ecash_string)
    }

    async fn cli_generate_invoice(label: &str) -> anyhow::Result<Invoice> {
        let cln_dir = std::env::var("FM_CLN_DIR").unwrap();
        let invoice_string = cmd!(
            "lightning-cli",
            "--network=regtest",
            "--lightning-dir={cln_dir}",
            "invoice",
            "1000",
            label,
            label
        )
        .out_json()
        .await?["bolt11"]
            .as_str()
            .map(|s| s.to_owned())
            .unwrap();
        Ok(Invoice::from_str(&invoice_string)?)
    }

    async fn cln_wait_invoice(label: &str) -> anyhow::Result<()> {
        let cln_dir = std::env::var("FM_CLN_DIR").unwrap();
        let status = cmd!(
            "lightning-cli",
            "--network=regtest",
            "--lightning-dir={cln_dir}",
            "waitinvoice",
            label
        )
        .out_json()
        .await?["status"]
            .as_str()
            .map(|s| s.to_owned())
            .unwrap();
        assert_eq!(status, "paid");
        Ok(())
    }

    async fn cln_pay_invoice(invoice_string: &str) -> anyhow::Result<()> {
        let cln_dir = std::env::var("FM_CLN_DIR").unwrap();
        cmd!(
            "lightning-cli",
            "--network=regtest",
            "--lightning-dir={cln_dir}",
            "pay",
            invoice_string
        )
        .run()
        .await?;
        Ok(())
    }

    struct FakeEventSink {
        pub events: Arc<RwLock<Vec<(String, String)>>>,
    }

    fn tx_ev() -> String {
        "transaction".into()
    }

    static INIT_TRACING: Once = Once::new();

    impl FakeEventSink {
        fn new() -> Self {
            Self {
                events: Arc::new(RwLock::new(vec![])),
            }
        }
    }

    impl IEventSink for FakeEventSink {
        fn event(&self, event_type: String, body: String) {
            let mut events = self
                .events
                .write()
                .expect("couldn't acquire FakeEventSink lock");
            events.push((event_type, body));
        }
        fn events(&self) -> Vec<(String, String)> {
            self.events
                .read()
                .expect("FakeEventSink could not acquire read lock")
                .clone()
        }
        fn num_events_of_type(&self, event_type: String) -> usize {
            self.events().iter().filter(|e| e.0 == event_type).count()
        }
    }

    // note: logging doesn't work yet at this point
    fn create_data_dir() -> PathBuf {
        tempfile::tempdir().unwrap().into_path()
    }

    async fn use_lnd_gateway(federation: &Federation) -> anyhow::Result<()> {
        let lnd_dir = std::env::var("FM_LND_DIR").unwrap();
        let pubkey: PublicKey = cmd!(
            "lncli",
            "-n",
            "regtest",
            "--lnddir={lnd_dir}",
            "--rpcserver=localhost:11009",
            "getinfo"
        )
        .out_json()
        .await?["identity_pubkey"]
            .as_str()
            .map(|s| s.to_owned())
            .unwrap()
            .parse()
            .unwrap();
        federation.ng_switch_gateway(pubkey).await?;
        Ok(())
    }

    async fn setup() -> anyhow::Result<(Arc<Bridge>, Arc<Federation>)> {
        INIT_TRACING.call_once(|| {
            TracingSetup::default()
                .init()
                .expect("Failed to initialize tracing");
        });

        let event_sink = Arc::new(FakeEventSink::new());
        let data_dir = create_data_dir();
        let storage = Arc::new(PathBasedStorage::new(data_dir));
        let bridge = fedimint_initialize_async(storage, event_sink).await?;
        let connect_string = std::env::var("FM_CONNECT_STRING").unwrap();
        let fedimint_federation = joinFederation(bridge.clone(), connect_string).await?;
        let federation = get_federation(&bridge, &fedimint_federation.id).await?;
        use_lnd_gateway(&federation).await?;
        Ok((bridge, federation))
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_join_and_leave_and_join_federation() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        leaveFederation(bridge, federation.federation_id().into()).await?;
        setup().await?;
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_leave_federation() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        let db_filename = format!("{}.db", federation.federation_id().to_string());
        let db_path = path::Path::new(&db_filename).join("LOCK").clone();
        {
            let federations_lock = bridge.federations.lock().await.clone();
            assert_eq!(1, federations_lock.keys().len());
            assert!(&bridge.storage.read_file(db_path.as_path()).await.is_ok());
        }
        bridge.leave_federation(&federation.federation_id()).await?;
        {
            let federations_lock = bridge.federations.lock().await.clone();
            assert_eq!(0, federations_lock.keys().len());
            assert!(&bridge.storage.read_file(db_path.as_path()).await.is_err());
        }
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_ecash_ng() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // receive ecash
        let ecash = cli_generate_ecash().await?;
        let rpc_ecash = serialize_ecash(&ecash);
        assert_eq!(0, bridge.event_sink.num_events_of_type(tx_ev()));
        receiveEcash(bridge.clone(), federation.federation_id().into(), rpc_ecash).await?;
        assert_eq!(1, bridge.event_sink.num_events_of_type(tx_ev()));

        // check balance
        assert_eq!(
            federation.ng_balance().await,
            fedimint_core::Amount::from_msats(10000)
        );

        // spend ecash
        let ecash_amount = types::Amount(fedimint_core::Amount::from_msats(1000));
        let rpc_ecash = generateEcash(
            bridge.clone(),
            federation.federation_id().into(),
            ecash_amount,
        )
        .await?;
        let notes: TieredMulti<SpendableNote> = parse_ecash(&rpc_ecash)?;
        assert_eq!(2, bridge.event_sink.num_events_of_type(tx_ev()));

        // receive with fedimint-cli
        let cfg_dir = std::env::var("FM_DATA_DIR").unwrap();
        let ecash = serialize_ecash(&notes);
        cmd!(
            "fedimint-cli",
            "--data-dir={cfg_dir}",
            "ng",
            "reissue",
            ecash
        )
        .run()
        .await?;

        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_lightning_receive() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        let amount = fedimint_core::Amount::from_msats(10000);
        let rpc_amount = types::Amount(amount);
        let description = "test".to_string();
        let invoice_string = generateInvoice(
            bridge.clone(),
            federation.federation_id().into(),
            rpc_amount,
            description,
        )
        .await?;

        cln_pay_invoice(&invoice_string).await?;

        // TODO: generateInvoice needs to spawn a task that reacts to updates
        tracing::info!("sleeping");
        fedimint_core::task::sleep(Duration::from_secs(2)).await;

        // TODO: hit balance api and check "federation" events
        assert_eq!(amount, federation.ng_balance().await);
        assert_eq!(1, federation.event_sink.num_events_of_type(tx_ev()));

        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_lightning_send() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // receive ecash
        let ecash = cli_generate_ecash().await?;
        federation.ng_receive_ecash(ecash).await?;

        let label = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();
        let label = format!("foo-{}", label);

        // get invoice
        let invoice = cli_generate_invoice(&label).await?;
        let invoice_string = invoice.to_string();

        // check balance
        assert_eq!(1, bridge.event_sink.num_events_of_type(tx_ev()));
        payInvoice(
            bridge.clone(),
            federation.federation_id().into(),
            invoice_string,
        )
        .await?;
        assert_eq!(2, bridge.event_sink.num_events_of_type(tx_ev()));

        // check that core-lightning got paid
        cln_wait_invoice(&label).await?;

        let history = federation.ng_history().await?;
        tracing::info!("history {:?}", history);

        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_get_mnemonic() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        let mnemonic = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;
        assert_eq!(12, mnemonic.len());
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_backup_and_recovery() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // receive ecash
        let ecash = cli_generate_ecash().await?;
        federation.ng_receive_ecash(ecash).await?;
        let original_balance = fedimint_core::Amount::from_msats(10_000);
        assert_eq!(original_balance, federation.ng_balance().await);

        // wipe notes
        federation.ng.wipe_state().await?;
        assert_eq!(
            fedimint_core::Amount::from_msats(0),
            federation.ng_balance().await
        );

        // recover
        let federation_id = federation.federation_id();
        let mnemonic = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;
        drop(federation);
        let _response = recoverFromMnemonic(bridge.clone(), federation_id.into(), mnemonic).await?;

        // assert that balance is updated
        let federation = get_federation(&*bridge, &federation_id.into()).await?;
        assert_eq!(original_balance, federation.ng_balance().await);
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_username_recovery() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // No username initially
        assert_eq!(None, federation.get_username().await);

        // Backup username (and ecash)
        let username = "satoshi123".to_string();
        backupXmppUsername(
            bridge.clone(),
            federation.federation_id().into(),
            username.clone(),
        )
        .await?;
        let mnemonic = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;
        let federation_id = federation.federation_id().into();

        // just to be sure, set the username in the client to something wrong
        federation.set_username("notsatoshi123".to_string()).await;
        drop(federation);
        let username_response =
            recoverFromMnemonic(bridge.clone(), federation_id, mnemonic).await?;

        // On recovery, the username is there.
        assert_eq!(Some(username), username_response);

        // TODO: load config from db and see that the username is in there

        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_social_recovery() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // Get original mnemonic (for comparison later)
        let words = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;
        info!("initial mnemnoic {:?}", &words);

        // Upload backup
        let video_file_path =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/backup.fedi");
        let video_file_contents = tokio::fs::read(&video_file_path).await?;
        let recovery_file_path = uploadBackupFile(
            bridge.clone(),
            federation.federation_id().into(),
            video_file_path,
        )
        .await?;
        info!(recovery_file_path = ?recovery_file_path);

        // Validate recovery file
        let valid = validateRecoveryFile(
            bridge.clone(),
            federation.federation_id().into(),
            recovery_file_path,
        )
        .await?;
        assert!(valid);

        // Generate recovery QR
        let qr = recoveryQr(bridge.clone(), federation.federation_id().into()).await?;
        let recovery_id = qr.recovery_id;

        // Download verification document
        let verification_doc_path = socialRecoveryDownloadVerificationDoc(
            bridge.clone(),
            federation.federation_id().into(),
            recovery_id.clone(),
        )
        .await?
        .unwrap();
        let contents = tokio::fs::read(verification_doc_path).await?;
        let _ = VerificationDocument::from_raw(&contents);
        assert_eq!(contents, video_file_contents);

        Ok(())
    }

    // #[tokio::test(flavor = "multi_thread")]
    // async fn test_modules() -> anyhow::Result<()> {
    //     let (_, federation) = setup().await?;
    //     let num_modules = federation.client.config().0.modules.keys().len();
    //     assert_eq!(num_modules, 3);
    //     Ok(())
    // }

    // #[tokio::test(flavor = "multi_thread")]
    // async fn test_xmpp_credentials() -> anyhow::Result<()> {
    //     let (_, fed1) = setup().await?;
    //     let (_, fed2) = setup().await?;
    //     let cred1 = fed1.xmpp_credentials().await;
    //     let cred2 = fed2.xmpp_credentials().await;
    //     // assert!(cred1.username != cred2.username);
    //     assert!(cred1.password != cred2.password);
    //     Ok(())
    // }

    // #[tokio::test(flavor = "multi_thread")]
    // async fn test_personal_recovery() -> anyhow::Result<()> {
    //     let (bridge, federation) = setup().await?;

    //     // Get original mnemonic (for comparison later)
    //     let words = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;
    //     let initial_mnemonic = Mnemonic::parse(words.join(" "))?;
    //     info!("initial mnemnoic {:?}", &words);

    //     let _username = recoverFromMnemonic(
    //         bridge.clone(),
    //         federation.federation_id().into(),
    //         initial_mnemonic
    //             .to_string()
    //             .split(" ")
    //             .map(|s| s.to_string())
    //             .collect(),
    //     )
    //     .await?;
    //     let words_after = getMnemonic(bridge.clone(), federation.federation_id().into()).await?;

    //     assert_eq!(words, words_after);

    //     Ok(())
    // }

    // #[tokio::test(flavor = "multi_thread")]
    // async fn test_decryption_shares() -> anyhow::Result<()> {
    //     // https://github.com/tokio-rs/tokio/issues/2374#issuecomment-1129447716
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
    // }
}
