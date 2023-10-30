mod dev;
pub mod social;

use std::any::Any;
use std::collections::HashMap;
use std::default::Default;
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use ::serde::{Deserialize, Serialize};
use anyhow::{anyhow, bail, Context, Result};
use bitcoin::secp256k1::{Message, PublicKey, Secp256k1, XOnlyPublicKey};
use bitcoin::Network;
use fedi_social_client::common::VerificationDocument;
use fedi_social_client::{FediSocialClientInit, RecoveryId};
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_client::backup::Metadata;
use fedimint_client::db::ChronologicalOperationLogKey;
use fedimint_client::oplog::{OperationLogEntry, UpdateStreamOrOutcome};
use fedimint_client::sm::OperationId;
use fedimint_client::{Client, ClientBuilder, ClientSecret};
use fedimint_core::api::{
    DynModuleApi, GlobalFederationApi, IGlobalFederationApi, InviteCode, WsFederationApi,
};
use fedimint_core::config::{ClientConfig, FederationId};
use fedimint_core::db::{DatabaseTransaction, IDatabase};
use fedimint_core::task::{timeout, MaybeSend, MaybeSync, TaskGroup};
use fedimint_core::{Amount, PeerId};
use fedimint_derive_secret::{ChildId, DerivableSecret};
use fedimint_ln_client::{
    network_to_currency, InternalPayState, LightningClientExt, LightningClientGen,
    LightningClientModule, LightningMeta, LnPayState, LnReceiveState, PayType,
};
use fedimint_mint_client::{
    spendable_notes_to_operation_id, MintClientExt, MintClientGen, MintClientModule, MintMeta,
    MintMetaVariants, OOBNotes, ReissueExternalNotesState, SpendOOBState,
};
use fedimint_wallet_client::{
    DepositState, WalletClientExt, WalletClientGen, WalletClientModule, WalletOperationMeta,
};
use futures::{Future, StreamExt};
use lightning_invoice::Invoice;
use stability_pool_client::common::AccountInfo;
use stability_pool_client::{
    StabilityPoolClientExt, StabilityPoolClientGen, StabilityPoolDepositState, StabilityPoolMeta,
};
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};
use v1_rocksdb::{
    FediClientConfigKey, InviteCodeKey, LastBackupTimestampKey, TransactionNotesKey,
    XmppUsernameKey,
};

use self::dev::{
    override_localhost_client_config, override_localhost_gateway, override_localhost_invite_code,
};
use self::social::{
    RecoveryFile, SocialBackup, SocialRecovery, SocialRecoveryIdKey, SocialRecoveryState,
    SocialRecoveryStateKey, SocialVerification, UserSeedPhrase,
};
use super::constants::{
    BACKUP_FREQUENCY, LIGHTNING_OPERATION_TYPE, LNURL_CHILD_ID, MINT_OPERATION_TYPE,
    NOSTR_CHILD_ID, ONE_WEEK, PAY_INVOICE_TIMEOUT, REISSUE_ECASH_TIMEOUT, SHUTDOWN_TIMEOUT,
    STABILITY_POOL_OPERATION_TYPE, WALLET_OPERATION_TYPE, XMPP_CHILD_ID, XMPP_KEYPAIR_SEED,
    XMPP_PASSWORD,
};
use super::event::{Event, EventSink, StabilityPoolOperationState, TypedEventExt};
use super::storage::Storage;
use super::types::{
    federation_v1_to_rpc_federation, FediBackupMetadata, RpcAmount, RpcInvoice,
    RpcLightningGatewayV1, RpcPayInvoiceResponse, RpcPublicKey, RpcRecoveryId,
    RpcSignedLnurlMessage, RpcXmppCredentials, SocialRecoveryApproval,
};
use crate::error::ErrorCode;
use crate::federation_v1::social::SOCIAL_RECOVERY_SECRET_CHILD_ID;
use crate::types::{
    EcashReceiveMetadata, RpcBalanceInfo, RpcBitcoinDetails, RpcEcashInfo, RpcFederationId,
    RpcGenerateEcashResponse, RpcLightningDetails, RpcLnState, RpcOnchainState, RpcTransaction,
    RpcTransactionDirection, SocialRecoveryQr,
};
use crate::utils::{display_currency, required_threashold_of, to_unix_time, unix_now};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediConfig {
    pub client_config: ClientConfig,
}

/// Federation is a wrapper of "client ng" to assist with handling RPC commands
#[derive(Clone)]
pub struct FederationV1 {
    pub client: Arc<Client>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    pub operation_states: Arc<Mutex<HashMap<OperationId, Box<dyn Any + Send + Sync + 'static>>>>,
}

#[derive(Serialize, Deserialize)]
#[serde(untagged)]
enum PayState {
    Pay(LnPayState),
    Internal(InternalPayState),
}

impl FederationV1 {
    /// Instantiate Federation from FediConfig
    fn build_client_builder(client_config: ClientConfig, db: Box<dyn IDatabase>) -> ClientBuilder {
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen(None));
        client_builder.with_module(FediSocialClientInit);
        client_builder.with_module(StabilityPoolClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(client_config);
        client_builder.with_dyn_database(db);
        client_builder
    }

    /// Instantiate Federation from another client
    ///
    /// This is a hack used during recovery to get a handle to the old database
    fn build_client_builder_from_client(old_client: Client) -> ClientBuilder {
        let client_config = old_client.get_config().clone();
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen(None));
        client_builder.with_module(FediSocialClientInit);
        client_builder.with_module(StabilityPoolClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(client_config);
        client_builder.with_old_client_database(old_client);
        client_builder
    }

    /// Constructor which starts a bunch of async tasks and ensures username is
    /// saved to db (e.g. after recovery)
    pub async fn new(ng: Arc<Client>, event_sink: EventSink, task_group: TaskGroup) -> Self {
        let mut federation = Self {
            client: ng,
            event_sink,
            task_group,
            operation_states: Default::default(),
        };
        federation.subscribe_balance_updates().await;
        federation.poll_scheduled_backups().await;
        federation.subscribe_to_all_operations().await;
        federation
    }

    /// Instantiate Federation from FediConfig
    pub async fn from_db(
        db: Box<dyn IDatabase>,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> anyhow::Result<Self> {
        let fedi_config = {
            let dbtx = db.begin_transaction().await;
            let notifications = Default::default();
            let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
            let config_string = dbtx
                .get_value(&FediClientConfigKey)
                .await
                .context("config not present in db")?
                .to_string();
            let fedi_config: FediConfig =
                serde_json::from_str(&config_string).context("invalid config")?;
            fedi_config
        };
        let client_builder = Self::build_client_builder(fedi_config.client_config, db);
        let client = client_builder.build::<Bip39RootSecretStrategy>().await?;
        Ok(Self::new(
            Arc::new(client),
            event_sink,
            task_group.make_subgroup().await,
        )
        .await)
    }

    /// Download federation configs using an invite code. Save client config to
    /// correct database with Storage.
    pub async fn join(
        invite_code_string: String,
        storage: &Storage,
        event_sink: EventSink,
        task_group: TaskGroup,
        db_name: &str,
    ) -> Result<Self> {
        // Download federation config
        let mut invite_code: InviteCode = InviteCode::from_str(&invite_code_string)?;
        override_localhost_invite_code(&mut invite_code);
        let api = Arc::new(WsFederationApi::from_invite_code(&[invite_code.clone()]))
            as Arc<dyn IGlobalFederationApi + Send + Sync + 'static>;
        let mut client_config: ClientConfig =
            api.as_ref().download_client_config(&invite_code).await?;
        override_localhost_client_config(&mut client_config);

        // Save client config and invite code
        let dyn_db = storage.federation_idb(db_name).await?;
        let dbtx = dyn_db.begin_transaction().await;
        let notifications = Default::default();
        let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
        let fedi_config = FediConfig { client_config };
        dbtx.insert_entry(&FediClientConfigKey, &serde_json::to_string(&fedi_config)?)
            .await;
        dbtx.insert_entry(&InviteCodeKey, &invite_code_string).await;
        dbtx.commit_tx().await;
        let federation = Self::from_db(dyn_db, event_sink, task_group).await?;

        Ok(federation)
    }

    /// Get federation ID
    pub fn federation_id(&self) -> FederationId {
        self.client.federation_id()
    }

    // Fetch which network we're using
    pub fn get_network(&self) -> Network {
        // FIXME: client.get_helper isn't currently exposed by the client, but is on v0
        let (wallet, _instance) = self
            .client
            .get_first_module::<WalletClientModule>(&fedimint_wallet_client::KIND);
        wallet.get_network()
    }

    /// Return federation name from meta, or take first 8 characters of
    /// federation ID
    pub fn federation_name(&self) -> String {
        self.client
            .get_meta("federation_name")
            .unwrap_or(self.federation_id().to_string()[0..8].to_string())
    }

    /// Create database transaction
    pub async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.client.db().begin_transaction().await
    }

    /// Fetch balance
    pub async fn get_balance(&self) -> Amount {
        self.wallet_summary().await.total_amount()
    }

    pub async fn balance_info(&self) -> RpcBalanceInfo {
        let summary = self.wallet_summary().await;
        RpcBalanceInfo {
            tiers: summary
                .iter()
                .map(|(tier, count)| (tier.msats, count))
                .collect(),
        }
    }

    async fn wallet_summary(&self) -> fedimint_core::TieredSummary {
        let (mint_client, _) = self
            .client
            .get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
        mint_client
            .get_wallet_summary(
                &mut self
                    .client
                    .db()
                    .begin_transaction()
                    .await
                    .with_module_prefix(1),
            )
            .await
    }

    /// Generate bitcoin address
    pub async fn generate_address(&self) -> Result<String> {
        let expires_at = fedimint_core::time::now() + Duration::from_secs(86400 * 365);
        let (operation_id, address) = self.client.get_deposit_address(expires_at).await?;

        self.subscribe_deposit(operation_id, address.to_string(), expires_at)
            .await?;

        Ok(address.to_string())
    }

    /// Generate lightning invoice
    pub async fn generate_invoice(
        &self,
        amount: RpcAmount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<RpcInvoice> {
        let (operation_id, invoice) = self
            .client
            .create_bolt11_invoice(amount.0, description, expiry_time)
            .await?;

        self.subscribe_invoice(operation_id, invoice.clone())
            .await?;

        invoice.try_into()
    }

    async fn subscribe_deposit(
        &self,
        operation_id: OperationId,
        address: String,
        expires_at: SystemTime,
    ) -> Result<()> {
        let fed = self.clone();
        let _ = fed
            .task_group
            .clone()
            .spawn("subscribe deposit", move |_| async move {
                let mut updates = fed
                    .client
                    .subscribe_deposit_updates(operation_id)
                    .await
                    .unwrap() // FIXME
                    .into_stream();
                while let Some(update) = updates.next().await {
                    info!("Update: {:?}", update);
                    fed.update_operation_state(operation_id, update.clone())
                        .await;
                    let deposit_outcome = update.clone();
                    match update {
                        DepositState::WaitingForConfirmation(data)
                        | DepositState::Claimed(data)
                        | DepositState::Confirmed(data) => {
                            let onchain_details = Some(RpcBitcoinDetails {
                                address: address.clone(),
                                expires_at: to_unix_time(expires_at)
                                    .expect("unix time should exist"),
                            });
                            let transaction = RpcTransaction {
                                id: operation_id.to_string(),
                                created_at: unix_now().expect("unix time should exist"),
                                amount: RpcAmount(Amount::from_sats(
                                    data.btc_transaction.output[data.out_idx as usize].value,
                                )),
                                direction: RpcTransactionDirection::Receive,
                                notes: "".into(),
                                onchain_state: RpcOnchainState::from_deposit_state(Some(
                                    deposit_outcome,
                                )),
                                bitcoin: onchain_details,
                                ln_state: None,
                                lightning: None,
                                oob_state: None,
                            };
                            info!("send_transaction_event: {:?}", transaction);
                            fed.send_transaction_event(transaction);
                        }
                        DepositState::Failed(reason) => {
                            // FIXME: handle this
                            error!("Failed to claim on-chain deposit: {reason}");
                        }
                        _ => {}
                    }
                }
            })
            .await;
        Ok(())
    }

    /// Subscribe to state updates for a given lightning invoice
    pub async fn subscribe_invoice(
        &self,
        operation_id: OperationId,
        invoice: Invoice, // TODO: fetch the invoice from the db
    ) -> Result<()> {
        let fed = self.clone();
        let _ = self
            .task_group
            .clone()
            .spawn("subscribe invoice", move |_| async move {
                let mut updates = fed
                    .client
                    .subscribe_ln_receive(operation_id)
                    .await
                    .unwrap() // FIXME
                    .into_stream();
                while let Some(update) = updates.next().await {
                    info!("Update: {:?}", update);
                    match update {
                        LnReceiveState::Claimed => {
                            let transaction = RpcTransaction {
                                id: operation_id.to_string(),
                                created_at: unix_now().expect("unix time should exist"),
                                amount: RpcAmount(Amount {
                                    msats: invoice.amount_milli_satoshis().unwrap(),
                                }),
                                direction: RpcTransactionDirection::Receive,
                                notes: "".into(),
                                bitcoin: None,
                                onchain_state: None,
                                ln_state: RpcLnState::from_ln_recv_state(Some(update)),
                                lightning: Some(RpcLightningDetails {
                                    invoice: invoice.to_string(),
                                    fee: None, // TODO: to be implemented on the fedimint side
                                }),
                                oob_state: None,
                            };
                            fed.send_transaction_event(transaction);
                        }
                        LnReceiveState::Canceled { reason } => {
                            // FIXME: handle this
                            error!("Failed to claim incoming contract: {reason}");
                        }
                        _ => {}
                    }
                }
            })
            .await;
        Ok(())
    }

    async fn override_active_gateway(&self) -> Result<()> {
        let (_lightning, instance) = self
            .client
            .get_first_module::<LightningClientModule>(&fedimint_ln_client::KIND);
        let dbtx = instance.db.begin_transaction().await;
        let mut gateway = self.client.select_active_gateway().await?;
        override_localhost_gateway(&mut gateway, dbtx).await;
        Ok(())
    }

    /// Check whether lightning invoice is safe to pay
    ///
    /// TODO: should we check if our balance exceeds it?
    pub async fn can_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        // Has an amount
        if invoice.amount_milli_satoshis().is_none() {
            bail!("Invoice is missing amount")
        }

        // Same network
        if network_to_currency(self.get_network()) != invoice.currency() {
            bail!(format!(
                "Invoice is for wrong network. Expected {}, got {}",
                self.get_network(),
                display_currency(invoice.currency())
            ))
        }

        Ok(())
    }

    /// Pay lightning invoice
    pub async fn pay_invoice(&self, invoice: &Invoice) -> Result<RpcPayInvoiceResponse> {
        self.override_active_gateway().await?;

        self.can_pay_invoice(invoice).await?;

        let _federation_id = self.federation_id();
        let (pay_type, _contract_id) = self.client.pay_bolt11_invoice(invoice.to_owned()).await?;

        let response = self.subscibe_to_ln_pay(pay_type, invoice.clone()).await?;

        Ok(response)
    }

    /// Subscribe to updates on all active operations
    ///
    /// This currently doesn't have a way to filter out in-active operations ...
    pub async fn subscribe_to_all_operations(&self) {
        let start = fedimint_core::time::now();
        let operations = self.client.get_active_operations().await;
        for operation_id in operations.iter() {
            if let Err(e) = self.subscribe_to_operation(*operation_id).await {
                warn!(
                    "failed to subscribe to operation: {:?} {:?}",
                    operation_id, e
                );
            }
        }
        info!(
            "subscribe_to_all_operations took {:?}",
            fedimint_core::time::now().duration_since(start)
        );
    }

    /// Listen for state machine transitions in order to emit events to frontend
    ///
    /// Called after starting re-client or after spawning new state machine
    pub async fn subscribe_to_operation(&self, operation_id: OperationId) -> Result<()> {
        // get operation
        let operation = self
            .client
            .operation_log()
            .get_operation(operation_id)
            .await
            .ok_or(anyhow::anyhow!("Operation not found"))?;
        match operation.operation_type() {
            LIGHTNING_OPERATION_TYPE => match operation.meta() {
                LightningMeta::Pay { invoice, .. } => {
                    let fed = self.clone();
                    let _ = self
                        .task_group
                        .clone()
                        .spawn("subscribe_to_ln_pay", move |_| async move {
                            // FIXME: what happens if it fails?
                            if let Err(e) = fed
                                .subscibe_to_ln_pay(PayType::Lightning(operation_id), invoice)
                                .await
                            {
                                warn!("subscribe_to_ln_pay error: {e:?}")
                            }
                        })
                        .await;
                }
                LightningMeta::Receive { invoice, .. } => {
                    let fed = self.clone();
                    let _ = self
                        .task_group
                        .clone()
                        .spawn("subscribe_to_ln_receive", move |_| async move {
                            // FIXME: what happens if it fails?
                            if let Err(e) = fed.subscribe_invoice(operation_id, invoice).await {
                                warn!("subscribe_to_ln_receive error: {e:?}")
                            }
                        })
                        .await;
                }
            },
            MINT_OPERATION_TYPE => {
                let meta = operation.meta::<MintMeta>();
                match meta.variant {
                    MintMetaVariants::SpendOOB { .. } => {
                        let fed = self.clone();
                        let _ = self
                            .task_group
                            .clone()
                            .spawn("subscribe_oob_spend", move |_| async move {
                                // FIXME: what happens if it fails?
                                fed.subscribe_oob_spend(operation_id).await
                            })
                            .await;
                    }
                    MintMetaVariants::Reissuance { .. } => {
                        let fed = self.clone();
                        let _ = self
                            .task_group
                            .clone()
                            .spawn("subscribe_to_ecash_reissue", move |_| async move {
                                // FIXME: what happens if it fails?
                                fed.subscribe_to_ecash_reissue(operation_id).await
                            })
                            .await;
                    }
                }
            }
            WALLET_OPERATION_TYPE => {
                let meta = operation.meta::<WalletOperationMeta>();
                match meta {
                    WalletOperationMeta::Deposit {
                        address,
                        expires_at,
                    } => {
                        self.subscribe_deposit(operation_id, address.to_string(), expires_at)
                            .await?;
                    }
                    WalletOperationMeta::Withdraw { .. }
                    | WalletOperationMeta::RbfWithdraw { .. } => {
                        tracing::debug!(
                            "Can't subscribe to operation id: {}",
                            operation.operation_type()
                        );
                    }
                }
            }
            STABILITY_POOL_OPERATION_TYPE => {
                let fed = self.clone();
                match operation.meta::<StabilityPoolMeta>() {
                    StabilityPoolMeta::Output {
                        is_cancellation_operation: false,
                        ..
                    } => {
                        self.task_group
                            .clone()
                            .spawn("subscribe_stability_pool_deposit", move |_| async move {
                                fed.subscribe_client_operation(
                                    fed.client
                                        .subscribe_deposit_or_renewal_operation(operation_id),
                                    |state| {
                                        Event::stability_pool_deposit(
                                            fed.federation_id(),
                                            operation_id,
                                            state,
                                        )
                                    },
                                )
                                .await
                            })
                            .await;
                    }
                    StabilityPoolMeta::Output {
                        is_cancellation_operation: true,
                        ..
                    }
                    | StabilityPoolMeta::Input { .. } => {
                        self.task_group
                            .clone()
                            .spawn("subscribe_stability_pool_withdraw", move |_| async move {
                                fed.subscribe_client_operation(
                                    fed.client.subscribe_withdraw(operation_id),
                                    |state| {
                                        Event::stability_pool_withdrawal(
                                            fed.federation_id(),
                                            operation_id,
                                            state,
                                        )
                                    },
                                )
                                .await
                            })
                            .await;
                    }
                }
            }
            // FIXME: should I return an error or just log something?
            _ => {
                tracing::debug!(
                    "Can't subscribe to operation id: {}",
                    operation.operation_type()
                );
            }
        }

        Ok(())
    }

    pub async fn subscibe_to_ln_pay(
        &self,
        pay_type: PayType,
        _invoice: Invoice,
    ) -> Result<RpcPayInvoiceResponse> {
        timeout(PAY_INVOICE_TIMEOUT, async {
            match pay_type {
                PayType::Internal(operation_id) => {
                    let mut updates = self
                        .client
                        .subscribe_internal_pay(operation_id)
                        .await?
                        .into_stream();

                    while let Some(update) = updates.next().await {
                        match update {
                            InternalPayState::Preimage(preimage) => {
                                updates.next().await;
                                return Ok(RpcPayInvoiceResponse {
                                    preimage: preimage.to_public_key()?.to_string(),
                                });
                            }
                            InternalPayState::RefundSuccess { .. } => {
                                updates.next().await;
                                bail!("Internal lightning payment failed, got refund");
                            }
                            InternalPayState::RefundError { .. } => {
                                updates.next().await;
                                bail!("Internal lightning payment failed, didn't get refund");
                            }
                            InternalPayState::FundingFailed { .. } => {
                                updates.next().await;
                                bail!("Failed to fund internal lightning payment");
                            }
                            InternalPayState::UnexpectedError(e) => {
                                updates.next().await;
                                bail!(e);
                            }
                            _ => {}
                        }

                        info!("Update: {:?}", update);
                    }
                    Err(anyhow!("Internal lightning payment failed"))
                }
                PayType::Lightning(operation_id) => {
                    let mut updates = self
                        .client
                        .subscribe_ln_pay(operation_id)
                        .await?
                        .into_stream();
                    while let Some(update) = updates.next().await {
                        self.update_operation_state(operation_id, update.clone())
                            .await;
                        match update {
                            LnPayState::Success { preimage } => {
                                updates.next().await;
                                return Ok(RpcPayInvoiceResponse { preimage });
                            }
                            LnPayState::Refunded { .. } => {
                                // TODO: better error message
                                updates.next().await;
                                bail!("Lightning payment failed, got refund")
                            }
                            LnPayState::Canceled { .. } => {
                                updates.next().await;
                                // FIXME: is this right?
                                bail!("Lightning payment failed, got refund")
                            }
                            LnPayState::UnexpectedError { error_message } => {
                                updates.next().await;
                                bail!(error_message)
                            }
                            _ => {}
                        }

                        info!("lightning update: {:?}", update);
                    }
                    Err(anyhow!("lightning payment failed"))
                }
            }
        })
        .await
        .context("Lightning payment failed ... awaiting refund")?
    }

    /// Start background task to listen for balance updates and emit
    /// "federation" events when one is observed
    async fn subscribe_balance_updates(&mut self) {
        let federation = self.clone();
        let _ = self
            .task_group
            .spawn(
                format!("{:?} balance subscription", federation.federation_name()),
                |_| async move {
                    let mut updates = federation.client.subscribe_balance_changes().await;
                    while (updates.next().await).is_some() {
                        federation.send_balance_event().await;
                    }
                },
            )
            .await;
    }

    fn send_transaction_event(&self, transaction: RpcTransaction) {
        let event = Event::transaction(self.federation_id(), transaction);
        self.event_sink.typed_event(&event);
    }

    /// Send whenever balance changes
    pub async fn send_balance_event(&self) {
        self.event_sink.typed_event(&Event::balance(
            self.federation_id(),
            self.get_balance().await,
        ));
    }

    /// Send whenever social recovery state changes
    pub async fn send_federation_event(&self) {
        let rpc_federation = federation_v1_to_rpc_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(rpc_federation);
        self.event_sink.typed_event(&event);
    }

    /// List all lightning gateways registered with the federation
    pub async fn list_gateways(&self) -> anyhow::Result<Vec<RpcLightningGatewayV1>> {
        let gateways = self.client.fetch_registered_gateways().await?;
        let active_gateway = self.client.select_active_gateway().await.ok();
        let bridge_gateways: Vec<RpcLightningGatewayV1> = gateways
            .into_iter()
            .map(|gw| RpcLightningGatewayV1 {
                api: gw.api.to_string(),
                node_pub_key: RpcPublicKey(gw.node_pub_key),
                gateway_id: RpcPublicKey(gw.gateway_id),
                active: active_gateway == Some(gw),
            })
            .collect();
        Ok(bridge_gateways)
    }

    /// Switch active lightning gateway
    pub async fn switch_gateway(&self, gateway_id: &PublicKey) -> Result<()> {
        self.client.set_active_gateway(gateway_id).await?;
        Ok(())
    }

    pub async fn receive_ecash_with_meta(
        &self,
        ecash: OOBNotes,
        meta: EcashReceiveMetadata,
    ) -> Result<Amount> {
        let amount = ecash.total_amount();
        // TODO: include metadata as 2nd argument
        let operation_id = self.client.reissue_external_notes(ecash, meta).await?;
        self.subscribe_to_ecash_reissue(operation_id).await?;
        Ok(amount)
    }

    /// Receive ecash
    /// TODO: user a better type than String
    pub async fn receive_ecash(&self, ecash: String) -> Result<Amount> {
        let ecash = OOBNotes::from_str(&ecash)?;
        let amt = self
            .receive_ecash_with_meta(ecash, EcashReceiveMetadata { internal: false })
            .await?;
        Ok(amt)
    }

    pub fn validate_ecash(ecash: String) -> Result<RpcEcashInfo> {
        let oob = OOBNotes::from_str(&ecash)?;
        Ok(RpcEcashInfo {
            amount: RpcAmount(oob.total_amount()),
            federation_id: Some(RpcFederationId(oob.federation_id)),
        })
    }

    pub async fn subscribe_to_ecash_reissue(&self, operation_id: OperationId) -> Result<()> {
        let mut updates = self
            .client
            .subscribe_reissue_external_notes(operation_id)
            .await
            .unwrap()
            .into_stream();

        while let Some(update) = updates.next().await {
            if let ReissueExternalNotesState::Failed(e) = update {
                updates.next().await;
                bail!(format!("Reissue failed: {e}"));
            }
        }
        Ok(())
    }

    /// Generate ecash
    /// FIXME: might be better to return a typed object here and serialize at
    /// RPC layer
    pub async fn generate_ecash(&self, amount: Amount) -> Result<RpcGenerateEcashResponse> {
        let cancel_time = fedimint_core::time::now() + ONE_WEEK;
        let (_, notes) = self.client.spend_notes(amount, ONE_WEEK, ()).await?;
        let notes = if amount != notes.total_amount() {
            // try to make change
            timeout(REISSUE_ECASH_TIMEOUT, async {
                self.receive_ecash_with_meta(notes, EcashReceiveMetadata { internal: true })
                    .await
            })
            .await
            .context("Failed to select notes with correct amount")??;
            let (_, new_notes) = self.client.spend_notes(amount, ONE_WEEK, ()).await?;
            new_notes
        } else {
            notes
        };
        Ok(RpcGenerateEcashResponse {
            ecash: notes.to_string(),
            cancel_at: to_unix_time(cancel_time)?,
        })
    }

    pub async fn cancel_ecash(&self, ecash: OOBNotes) -> Result<()> {
        let op_id = spendable_notes_to_operation_id(&ecash.notes);
        // NOTE: try_cancel_spend_notes itself is not presisted across restarts.
        // it uses inmemory channel.
        self.client.try_cancel_spend_notes(op_id).await;
        self.subscribe_oob_spend(op_id).await?;
        Ok(())
    }

    async fn subscribe_oob_spend(&self, op_id: OperationId) -> Result<(), anyhow::Error> {
        let mut updates = self
            .client
            .subscribe_spend_notes(op_id)
            .await?
            .into_stream();
        let mut err = None;
        while let Some(update) = updates.next().await {
            self.update_operation_state(op_id, update.clone()).await;
            match update {
                // TODO: intermediate states
                fedimint_mint_client::SpendOOBState::Created => {}
                fedimint_mint_client::SpendOOBState::UserCanceledProcessing => {}
                fedimint_mint_client::SpendOOBState::UserCanceledSuccess => {}
                fedimint_mint_client::SpendOOBState::Success => {}
                fedimint_mint_client::SpendOOBState::Refunded => {}
                fedimint_mint_client::SpendOOBState::UserCanceledFailure => {
                    err = Some(anyhow!(ErrorCode::EcashCancelFailed));
                }
            }
        }

        if let Some(err) = err {
            return Err(err);
        }
        Ok(())
    }

    /// Get client root secret
    fn root_secret(&self) -> DerivableSecret {
        self.client.external_secret()
    }

    /// Fetch mnemonic from database
    pub async fn get_mnemonic(&self) -> bip39::Mnemonic {
        self.client
            .root_secret_encoding::<Bip39RootSecretStrategy>()
            .await
    }

    /// Fetch mnemonic from database as vec of strings
    pub async fn get_mnemonic_words(&self) -> Vec<String> {
        self.get_mnemonic()
            .await
            .word_iter()
            .map(|s| s.to_string())
            .collect()
    }

    /// Backup all ecash and username with the federation
    pub async fn backup(&self) -> Result<()> {
        let username = self.get_xmpp_username().await;
        let backup = FediBackupMetadata::new(username);
        self.client
            .backup_to_federation(Metadata::from_json_serialized(backup))
            .await?;
        Ok(())
    }

    /// Extract username (and potentially more in future) from recovered
    /// metadata and save it to database
    pub async fn save_restored_metadata(&self, metadata: Metadata) -> Result<()> {
        if let Ok(fedi_backup_metadata) = metadata.to_json_deserialized::<FediBackupMetadata>() {
            if let Some(username) = fedi_backup_metadata.username {
                self.save_xmpp_username(&username).await;
            }
        };
        Ok(())
    }

    /// Recover federation from mnemonic
    pub async fn from_mnemonic(
        mnemonic: bip39::Mnemonic,
        old_client: Client,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Result<Self> {
        let client_builder = Self::build_client_builder_from_client(old_client);
        let secret = ClientSecret::<Bip39RootSecretStrategy>::new(mnemonic);
        let (client, metadata) = client_builder
            .build_restoring_from_backup::<Bip39RootSecretStrategy>(secret)
            .await?;

        let federation = Self::new(
            Arc::new(client),
            event_sink,
            task_group.make_subgroup().await,
        )
        .await;

        federation.save_restored_metadata(metadata).await?;

        Ok(federation)
    }

    /// Wipe state and shutdown tasks
    /// FIXME: maybe we should split this into 2 methods?
    pub async fn prepare_for_recovery(&self) -> Result<Client> {
        self.task_group
            .clone() // FIXME: remove this clone
            .shutdown_join_all(Some(SHUTDOWN_TIMEOUT))
            .await?;
        self.client.wipe_state().await?;
        let client: Client = self.client.as_ref().clone();
        Ok(client)
    }

    //
    // Social Recovery
    //

    /// Generate social recovery secret from root secret
    pub fn social_recovery_secret_static(root_secret: &DerivableSecret) -> DerivableSecret {
        // It's level 1 because we're using client.external_secret()
        assert_eq!(root_secret.level(), 1);
        root_secret.child_key(SOCIAL_RECOVERY_SECRET_CHILD_ID)
    }

    fn social_api(&self) -> DynModuleApi {
        let (_, instance) = self
            .client
            .get_first_module::<fedi_social_client::FediSocialClientModule>(
                &fedi_social_client::KIND,
            );
        self.client.api().with_module(instance.id)
    }

    pub async fn decoded_config(&self) -> Result<ClientConfig> {
        let client_config = self.client.get_config().clone();
        Ok(client_config.redecode_raw(self.client.decoders())?)
    }

    // Create social backup client
    pub async fn social_backup(&self) -> Result<SocialBackup> {
        let client_config = self.decoded_config().await?;
        let (module_id, cfg) = client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialBackup {
            module_secret: Self::social_recovery_secret_static(&self.root_secret()),
            module_id,
            config: cfg.clone(),
            api: self.social_api(),
        })
    }

    /// Start social recovery session
    pub async fn social_recovery_start(
        &self,
        recovery_file: RecoveryFile,
    ) -> anyhow::Result<SocialRecovery> {
        let client_config = self.decoded_config().await?;
        let (module_id, cfg) = client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_start(module_id, cfg.clone(), self.social_api(), recovery_file)
    }

    /// Continue social recovery session
    pub async fn social_recovery_continue_inner(
        &self,
        prev_state: SocialRecoveryState,
    ) -> Result<SocialRecovery> {
        let client_config = self.decoded_config().await?;
        let (module_id, cfg) = client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialRecovery::new_continue(
            module_id,
            cfg.clone(),
            self.social_api(),
            prev_state,
        ))
    }

    /// Attempt to continue a previous social recovery session by loading state
    /// from DB
    pub async fn social_recovery_continue(&self) -> Result<SocialRecovery> {
        let mut dbtx = self.dbtx().await;
        let state = dbtx
            .get_value(&SocialRecoveryStateKey(self.federation_id()))
            .await
            .ok_or(anyhow!("no active recovery session"))?;
        self.social_recovery_continue_inner(state).await
    }

    /// Get social verification client for a guardian
    pub async fn social_verification(&self, peer_id: PeerId) -> Result<SocialVerification> {
        Ok(SocialVerification::new(self.social_api(), peer_id))
    }

    /// Upload social recovery recovery file to federation given a recovery
    /// video
    pub async fn upload_backup_file(&self, video_file: Vec<u8>) -> Result<Vec<u8>> {
        let verification_doc = VerificationDocument::from_raw(&video_file);

        let seed_words = self.get_mnemonic_words().await;
        let seed_string = seed_words.join(" ");
        let seed_phrase = UserSeedPhrase::from(seed_string);

        let backup_client = self.social_backup().await?;
        let recovery_file =
            backup_client.prepare_recovery_file(verification_doc.clone(), seed_phrase.clone());
        backup_client
            .upload_backup_to_federation(&recovery_file)
            .await?;
        Ok(recovery_file.to_bytes())
    }

    /// Start a new social recovery session if one doesn't exist already
    /// FIXME: This will lead to bugs because if someone gets stuck inside a
    /// session there will be no way to exist Also won't be able to do
    /// simulataneous recoveries in 2 federations.
    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        let recovery_client = match self.social_recovery_continue().await {
            Ok(recovery_client) => recovery_client,
            Err(_) => {
                let recovery_client = self.social_recovery_start(recovery_file.clone()).await?;
                self.save_social_recovery_state(recovery_client.state())
                    .await;
                recovery_client
            }
        };
        // If we don't have a social recovery ID in the database, create one
        if self.get_social_recovery_id().await.is_none() {
            tracing::info!("saving social recovery id");
            let verification_request = recovery_client
                .create_verification_request(recovery_file.verification_document.clone())?;
            recovery_client
                .upload_verification_request(&verification_request)
                .await
                .context("upload verification request")?;
            let recovery_id = verification_request.recovery_id();
            self.save_social_recovery_id(&recovery_id).await;
        }
        self.send_federation_event().await;
        Ok(())
    }

    /// Produce social recovery QR
    pub async fn social_recovery_qr(&self) -> Result<SocialRecoveryQr> {
        // Return social recovery QR
        tracing::info!("looking up recovery id for qr");
        let recovery_id = self
            .get_social_recovery_id()
            .await
            .map(RpcRecoveryId)
            .ok_or(anyhow!("No recovery ID found"))?;
        Ok(SocialRecoveryQr { recovery_id })
    }

    /// Download social recovery video to `data_dir`
    pub async fn download_verification_doc(
        &self,
        recovery_id: &RecoveryId,
    ) -> Result<Option<Vec<u8>>> {
        tracing::info!("downloading verification doc {}", recovery_id);
        // FIXME: maybe shouldn't download from only one peer?
        let verification_client = self.social_verification(PeerId::from(0)).await?;
        let verification_doc = verification_client
            .download_verification_doc(*recovery_id)
            .await?;
        if let Some(verification_doc) = verification_doc {
            tracing::info!("downloaded verification doc");
            return Ok(Some(verification_doc.to_raw()?));
        };
        tracing::info!("no verificaiton doc found");

        Ok(None)
    }

    /// Approve social recovery request
    pub async fn approve_social_recovery_request(
        &self,
        recovery_id: &RecoveryId,
        peer_id: PeerId,
        password: &str,
    ) -> Result<()> {
        tracing::info!("approve social recovery {} {}", peer_id, password);
        let verification_client = self.social_verification(peer_id).await?;
        verification_client
            .approve_recovery(*recovery_id, password)
            .await?;
        Ok(())
    }

    /// Get a list of the state of all social recoveries from all guardians
    pub async fn social_recovery_approvals(&self) -> Result<(Vec<SocialRecoveryApproval>, usize)> {
        let mut recovery_client = self.social_recovery_continue().await?;
        let guardian_peer_ids: Vec<(String, PeerId)> = self
            .client
            .get_config()
            .clone()
            .global
            .api_endpoints
            .into_iter()
            .map(|(peer_id, endpoint)| (endpoint.name, peer_id))
            .collect();
        let mut approvals = vec![];
        for (guardian_name, peer_id) in guardian_peer_ids {
            let approved = recovery_client
                .get_decryption_share_from(peer_id)
                .await
                .unwrap_or_else(|_| {
                    debug!("failed to get decryption share from peer {}", peer_id);
                    false
                });
            approvals.push(SocialRecoveryApproval {
                guardian_name,
                approved,
            });
        }

        // calculate approvals remaining
        let approvals_required = required_threashold_of(approvals.len());
        let num_approvals = approvals.iter().filter(|a| a.approved).count();
        let remaining = approvals_required.saturating_sub(num_approvals);

        // Save progress to DB
        self.save_social_recovery_state(recovery_client.state())
            .await;

        Ok((approvals, remaining))
    }

    /// Attempt to recovery mnemonic from recovery shares available for download
    /// from the federation
    pub async fn social_recovery_combine_shares(&self) -> Result<bip39::Mnemonic> {
        let recovery_client = self.social_recovery_continue().await?;
        let seed_phrase = recovery_client.combine_recovered_user_phrase()?;
        let mnemonic = bip39::Mnemonic::parse(seed_phrase.0)?;
        Ok(mnemonic)
    }

    /// Sign LNURL message using a key derived from client secret
    pub async fn sign_lnurl_message(&self, msg: &Message) -> RpcSignedLnurlMessage {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret();
        let lnurl_secret = root_secret.child_key(ChildId(LNURL_CHILD_ID));
        let lnurl_keypair = lnurl_secret.to_secp_key(&secp);
        let lnurl_pubkey = lnurl_keypair.public_key();
        let signature = secp.sign_ecdsa(msg, &lnurl_keypair.secret_key());
        RpcSignedLnurlMessage {
            signature,
            pubkey: RpcPublicKey(lnurl_pubkey),
        }
    }

    /// Get Nostr public key
    pub async fn get_nostr_pub_key(&self) -> XOnlyPublicKey {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret();
        let nostr_secret = root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let nostr_pubkey = nostr_keypair.x_only_public_key();
        nostr_pubkey.0
    }

    /// Sign Nostr event
    pub async fn sign_nostr_event(&self, event_hash: String) -> Result<String> {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret();
        let nostr_secret = root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let data = &hex::decode(event_hash)?;
        let message = Message::from_slice(data)?;
        let sig = secp.sign_schnorr(&message, &nostr_keypair);
        // Return hex-encoded string
        Ok(format!("{}", sig))
    }

    /// Returns an XMPP password derived from client secret. This enables
    /// recovery of XMPP account after recovering wallet.
    pub async fn get_xmpp_credentials(&self) -> RpcXmppCredentials {
        let root_secret = self.root_secret();
        let xmpp_secret = root_secret.child_key(ChildId(XMPP_CHILD_ID));
        let password_bytes: [u8; 16] = xmpp_secret
            .child_key(ChildId(XMPP_PASSWORD))
            .to_random_bytes();
        let keypair_seed_bytes: [u8; 32] = xmpp_secret
            .child_key(ChildId(XMPP_KEYPAIR_SEED))
            .to_random_bytes();
        let username = self.get_xmpp_username().await;

        RpcXmppCredentials {
            password: hex::encode(password_bytes),
            keypair_seed: hex::encode(keypair_seed_bytes),
            username,
        }
    }

    /// Execute a backup if one is due and username is present (according to db)
    pub async fn scheduled_backup(&self) -> Result<()> {
        let now = fedimint_core::time::now();

        // Backup is due
        if let Some(last_backup) = self.get_last_backup_timestamp().await {
            if now.duration_since(last_backup)? < BACKUP_FREQUENCY {
                return Ok(());
            }
        };

        // FIXME: this potentially prevents race conditions, but degrades recovery for
        // federations without chat Username is present
        if self.get_xmpp_username().await.is_none() {
            return Ok(());
        }

        // Do backup and save timestamp to db
        self.backup().await?;
        self.save_last_backup_timestamp(now).await;

        info!("Finished periodic backup");
        Ok(())
    }

    /// Background task which does a backup with the federation twice per day
    async fn poll_scheduled_backups(&mut self) {
        let federation = self.clone();
        let _ = self
            .task_group
            .spawn(
                format!("{:?} scheduled backups", federation.federation_name()),
                |handle| async move {
                    loop {
                        // TODO: select!
                        if !handle.is_shutting_down() {
                            if let Err(e) = federation.scheduled_backup().await {
                                warn!("Error executing scheduled backup {e:?}");
                            }
                        }
                        // We check if a backup is due every 10 seconds
                        fedimint_core::task::sleep(Duration::from_secs(10)).await;
                    }
                },
            )
            .await;
    }

    pub async fn get_ln_pay_outcome(
        &self,
        operation_id: OperationId,
        log_entry: OperationLogEntry,
    ) -> Option<LnPayState> {
        let outcome = log_entry.outcome::<PayState>();

        // Return client's cached outcome if we find it
        if let Some(PayState::Pay(outcome)) = outcome {
            return Some(outcome);
        } else if matches!(outcome, Some(PayState::Internal(_))) {
            return None;
        }

        // Return our cached outcome if we find it
        if let Some(outcome) = self.get_operation_state(&operation_id).await {
            return Some(outcome);
        }

        None
    }

    pub async fn get_oob_spend_outcome(
        &self,
        operation_id: OperationId,
        log_entry: OperationLogEntry,
    ) -> Option<SpendOOBState> {
        let outcome = log_entry.outcome::<SpendOOBState>();

        // Return client's cached outcome if we find it
        if let Some(outcome) = outcome {
            return Some(outcome);
        }
        // Return our cached outcome if we find it
        if let Some(outcome) = self.get_operation_state(&operation_id).await {
            return Some(outcome);
        }

        None
    }

    pub async fn get_deposit_outcome(
        &self,
        operation_id: OperationId,
        log_entry: OperationLogEntry,
    ) -> Option<DepositState> {
        let outcome = log_entry.outcome::<DepositState>();

        // Return client's cached outcome if we find it
        if let Some(outcome) = outcome {
            return Some(outcome);
        }
        // Return our cached outcome if we find it
        if let Some(outcome) = self.get_operation_state(&operation_id).await {
            return Some(outcome);
        }

        // If no cached outcomes, consume the stream to get the outcome and populate
        // client's cache in future This is only useful for outgoing lightning
        // payments which fail due to timeout and nothing is subscribed to them
        let mut updates = match self.client.subscribe_deposit_updates(operation_id).await {
            Err(_) => return None,
            Ok(stream) => stream.into_stream(),
        };

        let mut last_state = None;
        while let Some(update) = updates.next().await {
            tracing::info!("update {:?}", update);
            last_state = Some(update);
        }
        last_state
    }

    /// Return all transactions via operation log
    pub async fn list_transactions(
        &self,
        limit: usize,
        start_after: Option<ChronologicalOperationLogKey>,
    ) -> Vec<RpcTransaction> {
        let futures = self
            .client
            .operation_log()
            .list_operations(limit, start_after)
            .await
            .into_iter()
            .map(
                |op: (ChronologicalOperationLogKey, OperationLogEntry)| async move {
                    let notes = self
                        .dbtx()
                        .await
                        .get_value(&TransactionNotesKey(op.0.operation_id))
                        .await
                        .unwrap_or_default();

                    match op.1.operation_type() {
                        LIGHTNING_OPERATION_TYPE => match op.1.meta() {
                            LightningMeta::Pay { invoice, .. } => Some(RpcTransaction {
                                id: op.0.operation_id.to_string(),
                                created_at: to_unix_time(op.0.creation_time)
                                    .expect("unix time should exist"),
                                amount: RpcAmount(Amount {
                                    msats: invoice.amount_milli_satoshis().unwrap(),
                                }),
                                direction: RpcTransactionDirection::Send,
                                notes,
                                onchain_state: None,
                                bitcoin: None,
                                ln_state: RpcLnState::from_ln_pay_state(
                                    self.get_ln_pay_outcome(op.0.operation_id, op.1).await,
                                ),
                                lightning: Some(RpcLightningDetails {
                                    invoice: invoice.to_string(),
                                    fee: None, // TODO: to be implemented on the fedimint side
                                }),
                                oob_state: None,
                            }),
                            LightningMeta::Receive { invoice, .. } => {
                                let ln_state = RpcLnState::from_ln_recv_state(
                                    op.1.outcome::<LnReceiveState>(),
                                );
                                Some(RpcTransaction {
                                    id: op.0.operation_id.to_string(),
                                    created_at: to_unix_time(op.0.creation_time)
                                        .expect("unix time should exist"),
                                    amount: RpcAmount(Amount {
                                        msats: invoice.amount_milli_satoshis().unwrap(),
                                    }),
                                    direction: RpcTransactionDirection::Receive,
                                    notes,
                                    onchain_state: None,
                                    bitcoin: None,
                                    ln_state,
                                    lightning: Some(RpcLightningDetails {
                                        invoice: invoice.to_string(),
                                        fee: None, /* TODO: to be implemented on the fedimint
                                                    * side */
                                    }),
                                    oob_state: None,
                                })
                            }
                        },
                        STABILITY_POOL_OPERATION_TYPE => match op.1.meta() {
                            StabilityPoolMeta::Output { .. } => Some(RpcTransaction {
                                id: op.0.operation_id.to_string(),
                                created_at: to_unix_time(op.0.creation_time)
                                    .expect("unix time should exist"),
                                amount: RpcAmount(Amount { msats: 0 }),
                                direction: RpcTransactionDirection::Send,
                                notes: "stability pool".to_string(),
                                ln_state: None,
                                lightning: None,
                            }),
                            StabilityPoolMeta::Input { .. } => Some(RpcTransaction {
                                id: op.0.operation_id.to_string(),
                                created_at: to_unix_time(op.0.creation_time)
                                    .expect("unix time should exist"),
                                amount: RpcAmount(Amount { msats: 0 }),
                                direction: RpcTransactionDirection::Send,
                                notes: "stability pool".to_string(),
                                ln_state: None,
                                lightning: None,
                            }),
                        },
                        MINT_OPERATION_TYPE => {
                            let mint_meta: MintMeta = op.1.meta();
                            match mint_meta.variant {
                                MintMetaVariants::Reissuance { .. } => {
                                    let internal = serde_json::from_value::<EcashReceiveMetadata>(
                                        mint_meta.extra_meta,
                                    )
                                    .map_or(false, |x| x.internal);
                                    if !internal {
                                        Some(RpcTransaction {
                                            id: op.0.operation_id.to_string(),
                                            created_at: to_unix_time(op.0.creation_time)
                                                .expect("unix time should exist"),
                                            direction: RpcTransactionDirection::Receive,
                                            notes,
                                            onchain_state: None,
                                            bitcoin: None,
                                            ln_state: None,
                                            amount: RpcAmount(mint_meta.amount),
                                            lightning: None,
                                            oob_state: None,
                                        })
                                    } else {
                                        None
                                    }
                                }
                                MintMetaVariants::SpendOOB {
                                    requested_amount, ..
                                } => Some(RpcTransaction {
                                    id: op.0.operation_id.to_string(),
                                    created_at: to_unix_time(op.0.creation_time)
                                        .expect("unix time should exist"),
                                    direction: RpcTransactionDirection::Send,
                                    notes,
                                    onchain_state: None,
                                    bitcoin: None,
                                    ln_state: None,
                                    amount: RpcAmount(requested_amount),
                                    lightning: None,
                                    oob_state: self
                                        .get_oob_spend_outcome(op.0.operation_id, op.1)
                                        .await
                                        .map(crate::types::RpcOOBState::from_spend_v1),
                                }),
                            }
                        }
                        WALLET_OPERATION_TYPE => match op.1.meta() {
                            WalletOperationMeta::Deposit {
                                address,
                                expires_at,
                            } => {
                                let outcome =
                                    self.get_deposit_outcome(op.0.operation_id, op.1).await;
                                let onchain_state =
                                    RpcOnchainState::from_deposit_state(outcome.clone());

                                Some(RpcTransaction {
                                    id: op.0.operation_id.to_string(),
                                    created_at: to_unix_time(op.0.creation_time)
                                        .expect("unix time should exist"),
                                    direction: RpcTransactionDirection::Receive,
                                    notes,
                                    onchain_state: onchain_state.clone(),
                                    bitcoin: Some(RpcBitcoinDetails {
                                        address: address.to_string(),
                                        expires_at: to_unix_time(expires_at)
                                            .expect("unix time should exist"),
                                    }),
                                    ln_state: None,
                                    amount: match outcome {
                                        Some(
                                            DepositState::WaitingForConfirmation(data)
                                            | DepositState::Confirmed(data)
                                            | DepositState::Claimed(data),
                                        ) => RpcAmount(Amount::from_sats(
                                            data.btc_transaction.output[data.out_idx as usize]
                                                .value,
                                        )),
                                        _ => RpcAmount(Amount::ZERO),
                                    },
                                    lightning: None,
                                    oob_state: None,
                                })
                            }
                            WalletOperationMeta::Withdraw {
                                address: _,
                                amount: _,
                                fee: _,
                                change: _,
                            }
                            | WalletOperationMeta::RbfWithdraw { rbf: _, change: _ } => None,
                        },
                        _ => {
                            panic!(
                                "Found unimplemented for module with operation type = {}",
                                op.1.operation_type()
                            );
                        }
                    }
                },
            );
        futures::future::join_all(futures)
            .await
            .into_iter()
            .flatten()
            .collect()
    }

    pub async fn update_transaction_notes(&self, transaction: OperationId, notes: String) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&TransactionNotesKey(transaction), &notes)
            .await;
        dbtx.commit_tx().await;
    }

    // Database

    pub async fn get_xmpp_username(&self) -> Option<String> {
        self.dbtx().await.get_value(&XmppUsernameKey).await
    }

    pub async fn save_xmpp_username(&self, username: &String) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&XmppUsernameKey, username).await;
        dbtx.commit_tx().await;
    }

    pub async fn get_last_backup_timestamp(&self) -> Option<SystemTime> {
        self.dbtx().await.get_value(&LastBackupTimestampKey).await
    }

    pub async fn save_last_backup_timestamp(&self, timestamp: SystemTime) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&LastBackupTimestampKey, &timestamp).await;
        dbtx.commit_tx().await;
    }

    pub async fn get_invite_code(&self) -> String {
        self.dbtx()
            .await
            .get_value(&InviteCodeKey)
            .await
            .expect("invite code must exist")
    }

    pub async fn save_social_recovery_state(&self, state: &SocialRecoveryState) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&SocialRecoveryStateKey(self.federation_id()), state)
            .await;
        dbtx.commit_tx().await;
    }

    /// Get social recovery Id from the DB. This is used to generate the
    /// recovery QR. FIXME: just put this in social recovery state
    pub async fn get_social_recovery_id(&self) -> Option<RecoveryId> {
        self.dbtx()
            .await
            .get_value(&SocialRecoveryIdKey(self.federation_id()))
            .await
    }

    /// Save social recovery ID to the DB. This is used to generate the recovery
    /// QR.
    pub async fn save_social_recovery_id(&self, state: &RecoveryId) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&SocialRecoveryIdKey(self.federation_id()), state)
            .await;
        dbtx.commit_tx().await;
    }

    /// Delete all social recovery state from DB
    pub async fn delete_social_recovery_state_and_id(&self) {
        let mut dbtx = self.dbtx().await;
        dbtx.remove_entry(&SocialRecoveryStateKey(self.federation_id()))
            .await;
        dbtx.remove_entry(&SocialRecoveryIdKey(self.federation_id()))
            .await;
        // TODO: delete the verification file?
        dbtx.commit_tx().await;
        // FIXME: a little weird to call this here
        self.send_federation_event().await;
    }

    async fn update_operation_state<T>(&self, operation_id: OperationId, state: T)
    where
        T: Send + Sync + 'static,
    {
        self.operation_states
            .lock()
            .await
            .insert(operation_id, Box::new(state));
    }

    async fn get_operation_state<T>(&self, operation_id: &OperationId) -> Option<T>
    where
        T: Clone + 'static,
    {
        Some(
            self.operation_states
                .lock()
                .await
                .get(operation_id)?
                .downcast_ref::<T>()
                .expect("incorrect type to get_operation_state")
                .clone(),
        )
    }

    /// Stability Pool

    /// Get user's stability pool account info
    pub async fn stability_pool_account_info(&self) -> Result<AccountInfo> {
        self.client
            .account_info()
            .await
            .context("Error when fetching account info")
    }

    /// Deposit the given amount of msats into the stability pool
    /// with the intention of seeking. Once the fedimint transaction
    /// is accepted, the deposit is staged (pending). When the next
    /// cycle turnover occurs, staged seeks are processed in order
    /// to produce locks.
    pub async fn stability_pool_deposit_to_seek(&self, amount: Amount) -> Result<OperationId> {
        let operation_id = self.client.deposit_to_seek(amount).await?;
        let fed = self.clone();
        self.task_group
            .clone()
            .spawn("subscribe_stability_pool_deposit", move |_| async move {
                fed.subscribe_client_operation(
                    fed.client
                        .subscribe_deposit_or_renewal_operation(operation_id),
                    |state| Event::stability_pool_deposit(fed.federation_id(), operation_id, state),
                )
                .await
            })
            .await;
        Ok(operation_id)
    }

    /// Withdraw both unlocked and locked balances, by implicitly waiting for
    /// cycle turnover for the locked balances to be freed up.
    /// `unlocked_amount` is extracted from staged seeks (pending deposits).
    /// `locked_bps` is extracted from locked seeks (completed deposits). The
    /// overall operation only completes when both parts have completed.
    /// Note that we can't delay withdrawing staged balance under the hood
    /// as it may otherwise become locked. Instead we focus on the overall
    /// operation lifecycle as far as UX is concerned.
    pub async fn stability_pool_withdraw(
        &self,
        unlocked_amount: Amount,
        locked_bps: u32,
    ) -> Result<OperationId> {
        let (operation_id, _) = self.client.withdraw(unlocked_amount, locked_bps).await?;
        let fed = self.clone();
        self.task_group
            .clone()
            .spawn("subscribe_stability_pool_withdraw", move |_| async move {
                fed.subscribe_client_operation(
                    fed.client.subscribe_withdraw(operation_id),
                    |state| {
                        Event::stability_pool_withdrawal(fed.federation_id(), operation_id, state)
                    },
                )
                .await
            })
            .await;
        Ok(operation_id)
    }

    async fn subscribe_client_operation<S, E, U>(&self, stream_gen: S, event_gen: E)
    where
        S: Future<Output = Result<UpdateStreamOrOutcome<U>>>,
        E: Fn(U) -> Event,
        U: MaybeSend + MaybeSync + 'static,
    {
        if let Ok(update_stream) = stream_gen.await {
            let mut updates = update_stream.into_stream();
            while let Some(state) = updates.next().await {
                self.event_sink.typed_event(&event_gen(state))
            }
        }
    }
}
