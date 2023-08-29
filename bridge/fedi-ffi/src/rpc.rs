#![allow(non_snake_case)]
use super::bridge::Bridge;
use super::error::ErrorCode;
use super::event::{EventSink, SocialRecoveryEvent};
use super::storage::Storage;
use super::types::{
    RpcAmount, RpcFederation, RpcFederationId, RpcInvoice, RpcLightningGateway,
    RpcPayInvoiceResponse, RpcPeerId, RpcPublicKey, RpcRecoveryId, RpcSignedLnurlMessage,
    RpcXmppCredentials, SocialRecoveryQr,
};
use crate::error::get_error_code;
use crate::federation_v0::initialize_fedi_file_from_rocksdb;
use anyhow::{bail, Context};
use bitcoin::secp256k1::Message;
use fedimint_mint_client::parse_ecash;
use futures::Future;
use lightning_invoice::Invoice;
use macro_rules_attribute::macro_rules_derive;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use std::sync::{atomic::AtomicU64, Arc};
pub use tokio;
use tracing::{error, info, instrument};

#[derive(Debug, thiserror::Error)]
pub enum FedimintError {
    #[error("{0}")]
    OtherError(#[from] anyhow::Error),
}

pub async fn fedimint_initialize_async(
    storage: Storage,
    event_sink: EventSink,
) -> anyhow::Result<Arc<Bridge>> {
    initialize_fedi_file_from_rocksdb(&storage).await?;
    let bridge = Bridge::new(storage, event_sink)
        .await
        .context("could not create a bridge")?;
    Ok(Arc::new(bridge))
}

fn rpc_error(error: &anyhow::Error) -> String {
    tracing::error!(%error, "rpc_error");
    let code = get_error_code(error);

    json!({ "error": error.to_string(), "code": code }).to_string()
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
async fn joinFederation(bridge: Arc<Bridge>, invite_code: String) -> anyhow::Result<RpcFederation> {
    info!("joining federation {:?}", invite_code);
    bridge.join_federation(invite_code).await
}

#[macro_rules_derive(rpc_method!)]
async fn listFederations(bridge: Arc<Bridge>) -> anyhow::Result<Vec<RpcFederation>> {
    Ok(bridge.list_federations().await)
}

#[macro_rules_derive(rpc_method!)]
async fn leaveFederation(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<()> {
    bridge.leave_federation(&federation_id.0).await
}

#[macro_rules_derive(rpc_method!)]
async fn generateInvoice(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    amount: RpcAmount,
    description: String,
) -> anyhow::Result<String> {
    let rpc_invoice = bridge
        .generate_invoice(federation_id, amount, description)
        .await?;
    // TODO: actually return the RpcInvoice (frontend expects string)
    Ok(rpc_invoice.invoice)
}

#[macro_rules_derive(rpc_method!)]
// FIXME: make this argument RpcInvoice?
async fn decodeInvoice(_bridge: Arc<Bridge>, invoice: String) -> anyhow::Result<RpcInvoice> {
    // TODO: validate the invoice (same network, haven't already paid, etc)
    let invoice: Invoice = invoice.trim().parse().context(ErrorCode::InvalidInvoice)?;
    let bridge_invoice = RpcInvoice::try_from(invoice)?;
    Ok(bridge_invoice)
}

#[macro_rules_derive(rpc_method!)]
async fn payInvoice(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    invoice: String,
) -> anyhow::Result<RpcPayInvoiceResponse> {
    let invoice: Invoice = invoice.trim().parse().context(ErrorCode::InvalidInvoice)?;
    bridge.pay_invoice(federation_id, &invoice).await
}

#[macro_rules_derive(rpc_method!)]
async fn listGateways(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<Vec<RpcLightningGateway>> {
    bridge.list_gateways(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn switchGateway(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    gateway_id: RpcPublicKey,
) -> anyhow::Result<()> {
    bridge.switch_gateway(federation_id, gateway_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn payAddress(
    _bridge: Arc<Bridge>,
    _federation_id: RpcFederationId,
    _address: String,
    // TODO: parse this as bitcoin::Amount
    _sats: u64,
) -> anyhow::Result<String> {
    bail!("not implemented")
}

#[macro_rules_derive(rpc_method!)]
async fn generateEcash(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    amount: RpcAmount,
) -> anyhow::Result<String> {
    bridge.generate_ecash(federation_id, amount).await
}

#[macro_rules_derive(rpc_method!)]
async fn receiveEcash(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    // TODO: better type
    ecash: String,
) -> anyhow::Result<RpcAmount> {
    bridge.receive_ecash(federation_id, ecash).await
}

#[macro_rules_derive(rpc_method!)]
async fn validateEcash(
    _bridge: Arc<Bridge>,
    _federation_id: RpcFederationId,
    ecash: String,
) -> anyhow::Result<RpcAmount> {
    // TODO: actually check that ecash was issued by this federation, and is unspent
    let amount = parse_ecash(&ecash)?.total_amount();
    Ok(RpcAmount(amount))
}

#[macro_rules_derive(rpc_method!)]
async fn listTransactions(
    _bridge: Arc<Bridge>,
    _federation_id: RpcFederationId,
) -> anyhow::Result<Vec<()>> {
    Ok(vec![])
}

#[macro_rules_derive(rpc_method!)]
async fn updateTransactionNotes(
    _bridge: Arc<Bridge>,
    _federation_id: RpcFederationId,
    _transaction_id: String,
    _notes: String,
) -> anyhow::Result<()> {
    // TODO
    Ok(())
}

#[macro_rules_derive(rpc_method!)]
async fn getMnemonic(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<Vec<String>> {
    bridge.get_mnemonic_words(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn recoverFromMnemonic(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    mnemonic: Vec<String>,
) -> anyhow::Result<Option<String>> {
    bridge.recover_from_mnemonic(federation_id, mnemonic).await

    // let mnemonic = mnemonic.join(" ");
    // let mnemonic: bip39::Mnemonic = mnemonic.parse()?;

    // let username = bridge.restore_federation(federation_id, mnemonic).await?;
    // Ok(username)
}

pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

#[macro_rules_derive(rpc_method!)]
async fn uploadBackupFile(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    video_file_path: PathBuf,
) -> anyhow::Result<PathBuf> {
    bridge
        .upload_backup_file(federation_id, video_file_path)
        .await
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
    federation_id: RpcFederationId,
    recovery_file_path: PathBuf,
) -> anyhow::Result<bool> {
    bridge
        .validate_recovery_file(federation_id, recovery_file_path)
        .await
}

// FIXME: maybe this would better be called "begin_social_recovery"
#[macro_rules_derive(rpc_method!)]
async fn recoveryQr(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<SocialRecoveryQr> {
    bridge.recovery_qr(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn socialRecoveryApprovals(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<SocialRecoveryEvent> {
    bridge.social_recovery_approvals(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn socialRecoveryDownloadVerificationDoc(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    recovery_id: RpcRecoveryId,
) -> anyhow::Result<Option<PathBuf>> {
    bridge
        .download_verification_doc(federation_id, recovery_id)
        .await
}

#[macro_rules_derive(rpc_method!)]
async fn approveSocialRecoveryRequest(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    recovery_id: RpcRecoveryId,
    peer_id: RpcPeerId,
    password: String,
) -> anyhow::Result<()> {
    bridge
        .approve_social_recovery_request(federation_id, recovery_id, peer_id, password)
        .await
}

#[macro_rules_derive(rpc_method!)]
async fn completeSocialRecovery(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<Option<String>> {
    bridge.complete_social_recovery(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn signLnurlMessage(
    bridge: Arc<Bridge>,
    // hex-encoded message
    message: String,
    federation_id: RpcFederationId,
) -> anyhow::Result<RpcSignedLnurlMessage> {
    let message = Message::from_slice(&hex::decode(message)?)?;
    bridge.sign_lnurl_message(federation_id, message).await
}

#[macro_rules_derive(rpc_method!)]
async fn xmppCredentials(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<RpcXmppCredentials> {
    bridge.xmpp_credentials(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn backupXmppUsername(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
    username: String,
) -> anyhow::Result<()> {
    bridge.backup_xmpp_username(federation_id, username).await
}

#[macro_rules_derive(rpc_method!)]
async fn getNostrPubKey(
    bridge: Arc<Bridge>,
    federation_id: RpcFederationId,
) -> anyhow::Result<String> {
    bridge.get_nostr_pub_key(federation_id).await
}

#[macro_rules_derive(rpc_method!)]
async fn signNostrEvent(
    bridge: Arc<Bridge>,
    event_hash: String,
    federation_id: RpcFederationId,
) -> anyhow::Result<String> {
    bridge.sign_nostr_event(federation_id, event_hash).await
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
    // Federations
    joinFederation,
    leaveFederation,
    listFederations,
    // Lightning
    generateInvoice,
    decodeInvoice,
    payInvoice,
    listGateways,
    switchGateway,
    // On-Chain
    payAddress,
    // Ecash
    generateEcash,
    receiveEcash,
    validateEcash,
    // Transactions
    listTransactions,
    updateTransactionNotes,
    // Recovery
    getMnemonic,
    recoverFromMnemonic,
    // Social recovery
    uploadBackupFile,
    locateRecoveryFile,
    validateRecoveryFile,
    recoveryQr,
    socialRecoveryApprovals,
    completeSocialRecovery,
    socialRecoveryDownloadVerificationDoc,
    approveSocialRecoveryRequest,
    // LNURL
    signLnurlMessage,
    // XMPP
    xmppCredentials,
    backupXmppUsername,
    // Nostr
    getNostrPubKey,
    signNostrEvent,
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

    use std::path::{Path, PathBuf};
    use std::str::FromStr;
    use std::sync::Once;
    use std::time::{Duration, UNIX_EPOCH};

    use anyhow::bail;
    use bitcoin::secp256k1::PublicKey;
    use devimint::cmd;
    use fedi_social_client::common::VerificationDocument;
    use fedimint_core::Amount;
    use fedimint_logging::TracingSetup;
    use std::sync::RwLock;

    use crate::bridge::MultiFederation;
    use crate::event::IEventSink;
    use crate::ffi::PathBasedStorage;

    use super::*;

    struct FakeEventSink {
        pub events: Arc<RwLock<Vec<(String, String)>>>,
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

    /// Get LND pubkey using lncli, then have `federation` switch to using
    /// whatever gateway is using that node pubkey
    async fn use_lnd_gateway(multi: &MultiFederation) -> anyhow::Result<()> {
        let lnd_dir = std::env::var("FM_LND_DIR").unwrap();
        let lnd_node_pubkey: PublicKey = cmd!(
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
        match multi {
            MultiFederation::V0(v0) => v0.switch_gateway(&lnd_node_pubkey).await,
            MultiFederation::V1(v1) => {
                let gateways = v1.list_gateways().await?;
                for gateway in gateways {
                    if gateway.node_pub_key.0 == lnd_node_pubkey {
                        v1.switch_gateway(&gateway.gateway_id.0).await?;
                        return Ok(());
                    }
                }
                bail!("No gateway is using LND's node pubkey")
            }
        }
    }

    async fn cli_generate_ecash(
        amount: fedimint_core::Amount,
        federation: &MultiFederation,
    ) -> anyhow::Result<String> {
        let cfg_dir = std::env::var("FM_DATA_DIR").unwrap();
        // FIXME; make a fedimint_cli helper ... just need to figure out how to pass the args
        let ecash_string = match federation {
            MultiFederation::V0(_) => cmd!(
                "fedimint-cli",
                "--data-dir={cfg_dir}",
                "ng",
                "spend",
                amount.msats.to_string()
            )
            .out_json()
            .await?["notes"]
                .as_str()
                .map(|s| s.to_owned())
                .expect("'note' key not found generating ecash with fedimint-cli"),
            MultiFederation::V1(_) => cmd!(
                "fedimint-cli",
                "--data-dir={cfg_dir}",
                "spend",
                amount.msats.to_string()
            )
            .out_json()
            .await?["notes"]
                .as_str()
                .map(|s| s.to_owned())
                .expect("'note' key not found generating ecash with fedimint-cli"),
        };
        Ok(ecash_string)
    }

    async fn cli_generate_invoice(label: &str, amount: &Amount) -> anyhow::Result<Invoice> {
        let cln_dir = std::env::var("FM_CLN_DIR").unwrap();
        let invoice_string = cmd!(
            "lightning-cli",
            "--network=regtest",
            "--lightning-dir={cln_dir}",
            "invoice",
            amount.msats,
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

    async fn cli_receive_ecash(
        ecash: String,
        federation: Arc<MultiFederation>,
    ) -> anyhow::Result<()> {
        let cfg_dir = std::env::var("FM_DATA_DIR").unwrap();
        // FIXME; make a fedimint_cli helper ... just need to figure out how to pass the args
        match *federation {
            MultiFederation::V0(_) => {
                cmd!(
                    "fedimint-cli",
                    "--data-dir={cfg_dir}",
                    "ng",
                    "reissue",
                    ecash
                )
                .run()
                .await?;
            }
            MultiFederation::V1(_) => {
                cmd!("fedimint-cli", "--data-dir={cfg_dir}", "reissue", ecash)
                    .run()
                    .await?;
            }
        }
        Ok(())
    }

    pub fn copy_recursively<A: AsRef<Path>>(
        source: impl AsRef<Path>,
        destination: A,
    ) -> std::io::Result<()> {
        std::fs::create_dir_all(&destination)?;
        for entry in std::fs::read_dir(source)? {
            let entry = entry?;
            let filetype = entry.file_type()?;
            if filetype.is_dir() {
                copy_recursively(entry.path(), destination.as_ref().join(entry.file_name()))?;
            } else {
                std::fs::copy(entry.path(), destination.as_ref().join(entry.file_name()))?;
            }
        }
        Ok(())
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

    async fn setup() -> anyhow::Result<(Arc<Bridge>, Arc<MultiFederation>)> {
        INIT_TRACING.call_once(|| {
            TracingSetup::default()
                .init()
                .expect("Failed to initialize tracing");
        });

        let event_sink = Arc::new(FakeEventSink::new());
        let data_dir = create_data_dir();
        let storage = Arc::new(PathBasedStorage::new(data_dir).await?);
        let bridge = fedimint_initialize_async(storage, event_sink).await?;
        let invite_code = std::env::var("FM_INVITE_CODE").unwrap();
        let fedimint_federation = joinFederation(bridge.clone(), invite_code).await?;
        let federation = bridge.get_multi(&fedimint_federation.id.0).await?;
        use_lnd_gateway(&federation).await?;
        Ok((bridge, federation))
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_fedi_file_migration() -> anyhow::Result<()> {
        INIT_TRACING.call_once(|| {
            TracingSetup::default()
                .init()
                .expect("Failed to initialize tracing");
        });

        let event_sink = Arc::new(FakeEventSink::new());
        // This fixture contains a "datadir" with 1 global database and one federations database (fedi alpha mutinynet)
        // TODO: copy the contents of this directory into a tmpdir
        let data_dir = create_data_dir();
        let fixture_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/v0_db");
        copy_recursively(fixture_dir, &data_dir)?;
        let storage = Arc::new(PathBasedStorage::new(data_dir).await?);
        let bridge = fedimint_initialize_async(storage, event_sink).await?;
        let federations = listFederations(bridge.clone()).await?;
        assert_eq!(federations.len(), 1);
        let federation = &federations[0];
        assert!(federation.invite_code.is_some());
        let xmpp_credentials = xmppCredentials(bridge, federation.id).await?;
        assert_eq!(Some("hotrod77".to_string()), xmpp_credentials.username);
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_join_and_leave_and_join() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        let env_invite_code = std::env::var("FM_INVITE_CODE").unwrap();
        let rpc_federation_id = RpcFederationId(federation.federation_id());
        let federations = listFederations(bridge.clone()).await?;
        assert_eq!(federations.len(), 1);
        assert_eq!(Some(env_invite_code), federations[0].invite_code);
        leaveFederation(bridge.clone(), rpc_federation_id).await?;
        assert_eq!(listFederations(bridge.clone()).await?.len(), 0);
        // FIXME: rocksdb lock bug
        // joinFederation(bridge.clone(), env_invite_code).await?;
        // assert_eq!(listFederations(bridge).await?.len(), 1);
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_lightning_send_and_receive() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;
        let receive_amount = fedimint_core::Amount::from_sats(100);
        let rpc_receive_amount = RpcAmount(receive_amount);
        let description = "test".to_string();
        let invoice_string = generateInvoice(
            bridge.clone(),
            RpcFederationId(federation.federation_id()),
            rpc_receive_amount,
            description,
        )
        .await?;

        cln_pay_invoice(&invoice_string).await?;

        // TODO: generateInvoice needs to spawn a task that reacts to updates
        fedimint_core::task::sleep(Duration::from_secs(4)).await;

        assert_eq!(receive_amount, federation.get_balance().await);

        let label = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();
        let label = format!("foo-{label}");

        // get invoice
        let send_amount = Amount::from_sats(50);
        let invoice = cli_generate_invoice(&label, &send_amount).await?;
        let invoice_string = invoice.to_string();

        // check balance
        payInvoice(
            bridge.clone(),
            RpcFederationId(federation.federation_id()),
            invoice_string,
        )
        .await?;

        // check that core-lightning got paid
        cln_wait_invoice(&label).await?;
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_ecash() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // receive ecash
        let ecash_receive_amount = fedimint_core::Amount::from_msats(10000);
        let ecash = cli_generate_ecash(ecash_receive_amount, &federation).await?;
        receiveEcash(
            bridge.clone(),
            RpcFederationId(federation.federation_id()),
            ecash,
        )
        .await?;

        // check balance
        assert_eq!(
            federation.get_balance().await,
            fedimint_core::Amount::from_msats(10000)
        );

        // spend ecash
        let send_ecash = generateEcash(
            bridge.clone(),
            RpcFederationId(federation.federation_id()),
            RpcAmount(ecash_receive_amount),
        )
        .await?;

        // receive with fedimint-cli
        cli_receive_ecash(send_ecash, federation).await?;

        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_backup_and_recovery() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // receive ecash
        let initial_balance = fedimint_core::Amount::from_msats(10_000);
        let ecash = cli_generate_ecash(initial_balance, &federation).await?;
        federation.receive_ecash(ecash).await?;
        assert_eq!(initial_balance, federation.get_balance().await);

        // set username and do a backup
        let federation_id = RpcFederationId(federation.federation_id());
        let username = "satoshi".to_string();
        backupXmppUsername(bridge.clone(), federation_id, username.clone()).await?;

        // wipe notes
        match &*federation {
            MultiFederation::V0(v0) => v0.client.wipe_state().await?,
            MultiFederation::V1(v1) => v1.client.wipe_state().await?,
        }
        assert_eq!(
            fedimint_core::Amount::from_msats(0),
            federation.get_balance().await
        );

        // recover
        let mnemonic = getMnemonic(bridge.clone(), federation_id).await?;
        drop(federation);
        let _response = recoverFromMnemonic(bridge.clone(), federation_id, mnemonic).await?;

        // assert that balance is updated
        let federation = bridge.get_multi(&federation_id.0).await?;
        assert_eq!(initial_balance, federation.get_balance().await);
        assert_eq!(Some(username), federation.get_xmpp_username().await);
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_social_recovery() -> anyhow::Result<()> {
        let (bridge, federation) = setup().await?;

        // Social recovery not supported for v0 federations.
        if let MultiFederation::V0(_) = *federation {
            return Ok(());
        }

        // Get original mnemonic (for comparison later)
        let federation_id = RpcFederationId(federation.federation_id());
        let initial_words = getMnemonic(bridge.clone(), federation_id).await?;
        info!("initial mnemnoic {:?}", &initial_words);

        // Upload backup
        let video_file_path =
            PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../fixtures/backup.fedi");
        let video_file_contents = tokio::fs::read(&video_file_path).await?;
        let recovery_file_path =
            uploadBackupFile(bridge.clone(), federation_id, video_file_path).await?;
        let locate_recovery_file_path = locateRecoveryFile(bridge.clone()).await?;
        assert_eq!(recovery_file_path, locate_recovery_file_path);

        // Validate recovery file
        let valid = validateRecoveryFile(bridge.clone(), federation_id, recovery_file_path).await?;
        assert!(valid);

        // Generate recovery QR
        let qr = recoveryQr(bridge.clone(), federation_id).await?;
        let recovery_id = qr.recovery_id;

        // Download verification document
        let verification_doc_path =
            socialRecoveryDownloadVerificationDoc(bridge.clone(), federation_id, recovery_id)
                .await?
                .unwrap();
        let contents = tokio::fs::read(verification_doc_path).await?;
        let _ = VerificationDocument::from_raw(&contents);
        assert_eq!(contents, video_file_contents);

        // 3 guardians approves
        for i in 0..3 {
            let password = "admin-pass";
            approveSocialRecoveryRequest(
                bridge.clone(),
                federation_id,
                recovery_id,
                RpcPeerId(fedimint_core::PeerId::from(i)),
                password.into(),
            )
            .await?;
        }

        // Member checks approval status
        let social_recovery_event = socialRecoveryApprovals(bridge.clone(), federation_id).await?;
        assert_eq!(0, social_recovery_event.remaining);
        assert_eq!(
            3,
            social_recovery_event
                .approvals
                .iter()
                .filter(|app| app.approved)
                .count()
        );

        // Member combines decryption shares, loading recovered mnemonic back into their db
        completeSocialRecovery(bridge.clone(), federation_id).await?;

        // Check backups match (TODO: how can I make sure that they're equal b/c nothing happened?)
        let final_words: Vec<String> = getMnemonic(bridge.clone(), federation_id).await?;
        assert_eq!(initial_words, final_words);

        Ok(())
    }
}
