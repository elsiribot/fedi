mod dev;
mod utils;

use std::any::Any;
use std::collections::HashMap;
use std::default::Default;
use std::str::FromStr;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use anyhow::{anyhow, bail, Context, Result};
use bitcoin::secp256k1::{Message, PublicKey, Secp256k1};
use bitcoin::Network;
use fedimint_bip39_v0::Bip39RootSecretStrategy;
use fedimint_client_v0::backup::Metadata;
use fedimint_client_v0::db::ChronologicalOperationLogKey;
use fedimint_client_v0::sm::OperationId;
use fedimint_client_v0::{get_client_root_secret, Client, ClientBuilder, OperationLogEntry};
use fedimint_core_v0::api::{
    GlobalFederationApi, WsClientConnectInfo as InviteCode, WsFederationApi,
};
use fedimint_core_v0::config::{ClientConfig, FederationId};
use fedimint_core_v0::db::{DatabaseTransaction, IDatabase};
use fedimint_core_v0::task::{timeout, TaskGroup};
use fedimint_core_v0::{Amount, TieredMulti};
use fedimint_derive_secret_v0::{ChildId, DerivableSecret};
use fedimint_ln_client_v0::{
    network_to_currency, LightningClientExt, LightningClientGen, LightningClientModule,
    LightningMeta, LnPayState, LnReceiveState,
};
use fedimint_mint_client_v0::{
    spendable_notes_to_operation_id, MintClientExt, MintClientGen, MintClientModule, MintMeta,
    MintMetaVariants, ReissueExternalNotesState, SpendOOBState,
};
use fedimint_wallet_client_v0::{WalletClientExt, WalletClientGen};
use futures::StreamExt;
use lightning_invoice_v1::Invoice;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::{error, info, warn};
use v0_rocksdb::{
    FediClientConfigKey, InviteCodeKey, LastBackupTimestampKey, TransactionNotesKey,
    XmppUsernameKey,
};

use self::dev::{
    override_localhost_client_config, override_localhost_gateway, override_localhost_invite_code,
};
use self::utils::{parse_ecash, serialize_ecash};
use super::constants::{
    LNURL_CHILD_ID, ONE_WEEK, PAY_INVOICE_TIMEOUT, XMPP_CHILD_ID, XMPP_KEYPAIR_SEED, XMPP_PASSWORD,
};
use super::event::{Event, EventSink, TypedEventExt};
use super::storage::Storage;
use super::translate::Translate;
use super::types::{
    federation_v0_to_rpc_federation, FediBackupMetadata, RpcAmount, RpcInvoice,
    RpcLightningGatewayV0, RpcPayInvoiceResponse, RpcPublicKey, RpcSignedLnurlMessage,
    RpcXmppCredentials,
};
use crate::constants::{
    BACKUP_FREQUENCY, LIGHTNING_OPERATION_TYPE, MINT_OPERATION_TYPE, REISSUE_ECASH_TIMEOUT,
};
use crate::error::ErrorCode;
use crate::types::{
    EcashReceiveMetadata, RpcBalanceInfo, RpcEcashInfo, RpcGenerateEcashResponse,
    RpcLightningDetails, RpcLnState, RpcOOBState, RpcTransaction, RpcTransactionDirection,
};
use crate::utils::{display_currency_v1, to_unix_time, unix_now};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediConfig {
    pub client_config: ClientConfig,
}

/// Federation wraps fedimint_client::Client
#[derive(Clone)]
pub struct FederationV0 {
    pub client: Arc<Client>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    pub operation_states: Arc<Mutex<HashMap<OperationId, Box<dyn Any + Send + Sync + 'static>>>>,
}

impl FederationV0 {
    /// Instantiate Federation from FediConfig
    fn build_client_builder(client_config: ClientConfig, db: Box<dyn IDatabase>) -> ClientBuilder {
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(client_config);
        client_builder.with_dyn_database(db);
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
        // FIXME: this breaks backup and recovery test
        federation.poll_scheduled_backups().await;
        federation.poll_balance().await;
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
        let client = client_builder
            .build::<Bip39RootSecretStrategy>(&mut task_group.make_subgroup().await)
            .await?;
        Ok(Self::new(
            Arc::new(client),
            event_sink,
            task_group.make_subgroup().await,
        )
        .await)
    }

    pub async fn download_client_config(invite_code_string: &str) -> anyhow::Result<ClientConfig> {
        let mut invite_code: InviteCode = InviteCode::from_str(invite_code_string)?;
        override_localhost_invite_code(&mut invite_code);
        let api = WsFederationApi::from_connect_info(&[invite_code.clone()]);
        Ok(api.download_client_config(&invite_code).await?)
    }

    /// Download federation configs using an invite code. Save client config to
    /// correct database with Storage.
    pub async fn join(
        invite_code_string: String,
        storage: &Storage,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Result<Self> {
        let mut client_config = Self::download_client_config(&invite_code_string).await?;
        override_localhost_client_config(&mut client_config);

        // Save client config and invite code
        let federation_id: FederationId = client_config.federation_id;
        let dyn_db = storage
            .federation_idb_v0(&federation_id.to_string())
            .await?;
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

    /// Return federation name from meta, or take first 8 characters of
    /// federation ID
    pub fn federation_name(&self) -> String {
        self.client
            .get_meta("federation_name")
            .unwrap_or(self.federation_id().to_string()[0..8].to_string())
    }

    // Fetch which network we're using
    pub fn get_network(&self) -> Network {
        self.client.get_network()
    }

    /// Create database transaction
    pub async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.client.db().begin_transaction().await
    }

    /// Fetch balance
    pub async fn get_balance(&self) -> fedimint_core_v0::Amount {
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

    async fn wallet_summary(&self) -> fedimint_core_v0::TieredSummary {
        let (mint_client, _) = self
            .client
            .get_first_module::<MintClientModule>(&fedimint_mint_client_v0::KIND);
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

    /// Generate lightning invoice
    pub async fn generate_invoice(
        &self,
        amount: RpcAmount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<RpcInvoice> {
        let (operation_id, invoice) = self
            .client
            .create_bolt11_invoice(amount.0.translate(), description, expiry_time)
            .await?;

        self.subscribe_invoice(operation_id, invoice.clone())
            .await?;

        invoice.translate().try_into()
    }

    /// Subscribe to state updates for a given lightning invoice
    pub async fn subscribe_invoice(
        &self,
        operation_id: OperationId,
        invoice: Invoice, // TODO: fetch the invoice from the db
    ) -> Result<()> {
        let fed = self.clone();
        self.task_group
            .clone()
            .spawn("subscribe invoice", move |_| async move {
                let mut updates = fed
                    .client
                    .subscribe_to_ln_receive_updates(operation_id)
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
                                amount: RpcAmount(
                                    Amount {
                                        msats: invoice.amount_milli_satoshis().unwrap(),
                                    }
                                    .translate(),
                                ),
                                direction: RpcTransactionDirection::Receive,
                                onchain_state: None,
                                bitcoin: None,
                                notes: "".into(),
                                // FIXME: map v0 to v1 states on best effort basis
                                // ln_state: RpcLnState::from_ln_recv_state(Some(update)),
                                ln_state: None,
                                lightning: Some(RpcLightningDetails {
                                    invoice: invoice.to_string(),
                                    fee: None, // TODO: to be implemented on the fedimint side
                                }),
                                oob_state: None,
                                onchain_withdrawal_details: None,
                                stability_pool_state: None,
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
            .get_first_module::<LightningClientModule>(&fedimint_ln_client_v0::KIND);
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
                display_currency_v1(invoice.currency())
            ))
        }

        Ok(())
    }

    /// Pay lightning invoice
    pub async fn pay_invoice(&self, invoice: &Invoice) -> Result<RpcPayInvoiceResponse> {
        self.override_active_gateway().await?;

        self.can_pay_invoice(invoice).await?;

        let federation_id = self.federation_id();
        let operation_id = self
            .client
            .pay_bolt11_invoice(federation_id, invoice.to_owned())
            .await?;

        let response = self
            .subscibe_to_ln_pay(operation_id, invoice.clone())
            .await?;

        Ok(response)
    }

    /// Subscribe to updates on all active operations
    ///
    /// This currently doesn't have a way to filter out in-active operations ...
    pub async fn subscribe_to_all_operations(&self) {
        let start = fedimint_core_v0::time::now();
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
            fedimint_core_v0::time::now().duration_since(start)
        );
    }

    /// Listen for state machine transitions in order to emit events to frontend
    ///
    /// Called after starting re-client or after spawning new state machine
    pub async fn subscribe_to_operation(&self, operation_id: OperationId) -> Result<()> {
        // get operation
        let operation = self
            .client
            .get_operation(operation_id)
            .await
            .ok_or(anyhow::anyhow!("Operation not found"))?;
        // let ln_op = LightningCommonGen::KIND.as_str();
        // let wallet_op = WalletCommonGen::KIND.as_str();
        // let mint_op = WalletCommonGen::KIND.as_str();
        match operation.operation_type() {
            // FIXME: dont' hard-code "ln" / "mint"
            "ln" => match operation.meta() {
                LightningMeta::Pay { invoice, .. } => {
                    let fed = self.clone();
                    self.task_group
                        .clone()
                        .spawn("subscribe_to_ln_pay", move |_| async move {
                            // FIXME: what happens if it fails?
                            // FIXME: detect PayType
                            if let Err(e) = fed.subscibe_to_ln_pay(operation_id, invoice).await {
                                warn!("subscribe_to_ln_pay error: {e:?}")
                            }
                        })
                        .await;
                }
                LightningMeta::Receive { invoice, .. } => {
                    let fed = self.clone();
                    self.task_group
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
            "mint" => {
                let meta = operation.meta::<MintMeta>();
                match meta.variant {
                    MintMetaVariants::SpendOOB { .. } => {
                        let fed = self.clone();
                        self.task_group
                            .clone()
                            .spawn("subscribe_oob_spend", move |_| async move {
                                // FIXME: what happens if it fails?
                                fed.subscribe_oob_spend(operation_id).await
                            })
                            .await;
                    }
                    MintMetaVariants::Reissuance { .. } => {
                        let fed = self.clone();
                        self.task_group
                            .clone()
                            .spawn("subscribe_to_ecash_reissue", move |_| async move {
                                // FIXME: what happens if it fails?
                                fed.subscribe_to_ecash_reissue(operation_id).await
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
        operation_id: OperationId,
        _invoice: Invoice,
    ) -> Result<RpcPayInvoiceResponse> {
        let mut updates = self
            .client
            .subscribe_ln_pay_updates(operation_id)
            .await?
            .into_stream();

        let future = async {
            while let Some(update) = updates.next().await {
                self.update_operation_state(operation_id, update.clone())
                    .await;
                match update {
                    LnPayState::Success { preimage } => {
                        return Ok(RpcPayInvoiceResponse { preimage });
                    }
                    LnPayState::Refunded { gateway_error } => {
                        return Err(gateway_error.into());
                    }
                    _ => {}
                };
                info!("lightning update: {:?}", update);
            }
            bail!("lightning payment failed")
        };
        match timeout(PAY_INVOICE_TIMEOUT, future).await {
            Ok(result) => result,
            Err(_) => bail!("Lightning payment failed ... awaiting refund"),
        }
    }

    /// Start background task to listen for balance updates and emit
    /// "federation" events when one is observed
    async fn subscribe_balance_updates(&mut self) {
        let federation = self.clone();
        self.task_group
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
        let event = Event::transaction(self.federation_id().to_string(), transaction);
        self.event_sink.typed_event(&event);
    }

    /// Send whenever balance changes
    pub async fn send_balance_event(&self) {
        self.event_sink.typed_event(&Event::balance(
            self.federation_id().to_string(),
            self.get_balance().await.translate(),
        ));
    }

    /// Send whenever social recovery state changes
    pub async fn send_federation_event(&self) {
        let rpc_federation = federation_v0_to_rpc_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(rpc_federation);
        self.event_sink.typed_event(&event);
    }

    /// List all lightning gateways registered with the federation
    pub async fn list_gateways(&self) -> anyhow::Result<Vec<RpcLightningGatewayV0>> {
        let gateways = self.client.fetch_registered_gateways().await?;
        let active_gateway = self.client.select_active_gateway().await.ok();
        let bridge_gateways: Vec<RpcLightningGatewayV0> = gateways
            .into_iter()
            .map(|gw| RpcLightningGatewayV0 {
                api: gw.api.to_string(),
                node_pub_key: RpcPublicKey(gw.node_pub_key),
                mint_pub_key: gw.mint_pub_key,
                active: active_gateway == Some(gw),
            })
            .collect();
        Ok(bridge_gateways)
    }

    /// Switch active lightning gateway
    pub async fn switch_gateway(&self, pubkey: &PublicKey) -> Result<()> {
        self.client.set_active_gateway(pubkey).await?;
        Ok(())
    }

    pub async fn receive_ecash_with_meta(
        &self,
        ecash: TieredMulti<fedimint_mint_client_v0::SpendableNote>,
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
        let ecash = parse_ecash(&ecash)?;
        let amt = self
            .receive_ecash_with_meta(ecash, EcashReceiveMetadata { internal: false })
            .await?;
        Ok(amt)
    }

    pub fn validate_ecash(ecash: String) -> Result<RpcEcashInfo> {
        let ecash = parse_ecash(&ecash)?;
        Ok(RpcEcashInfo {
            amount: RpcAmount(ecash.total_amount().translate()),
            federation_id: None,
        })
    }

    pub async fn subscribe_to_ecash_reissue(&self, operation_id: OperationId) -> Result<()> {
        let mut updates = self
            .client
            .subscribe_reissue_external_notes_updates(operation_id)
            .await
            .unwrap()
            .into_stream();

        while let Some(update) = updates.next().await {
            if let ReissueExternalNotesState::Failed(e) = update {
                bail!(format!("Reissue failed: {e}"));
            }
        }

        Ok(())
    }

    /// Generate ecash
    pub async fn generate_ecash(&self, amount: Amount) -> Result<RpcGenerateEcashResponse> {
        let cancel_time = fedimint_core_v1::time::now() + ONE_WEEK;
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
            ecash: serialize_ecash(&notes),
            cancel_at: to_unix_time(cancel_time)?,
        })
    }

    pub async fn cancel_ecash(
        &self,
        ecash: TieredMulti<fedimint_mint_client_v0::SpendableNote>,
    ) -> Result<()> {
        let op_id = spendable_notes_to_operation_id(&ecash);
        // NOTE: try_cancel_spend_notes itself is not presisted across restarts.
        // it uses inmemory channel.
        self.client.try_cancel_spend_notes(op_id).await;
        self.subscribe_oob_spend(op_id).await?;
        Ok(())
    }

    async fn subscribe_oob_spend(&self, op_id: OperationId) -> Result<(), anyhow::Error> {
        let mut updates = self
            .client
            .subscribe_spend_notes_updates(op_id)
            .await?
            .into_stream();
        let mut err = None;
        while let Some(update) = updates.next().await {
            self.update_operation_state(op_id, update.clone()).await;
            match update {
                // TODO: intermediate states
                fedimint_mint_client_v0::SpendOOBState::Created => {}
                fedimint_mint_client_v0::SpendOOBState::UserCanceledProcessing => {}
                fedimint_mint_client_v0::SpendOOBState::UserCanceledSuccess => {}
                fedimint_mint_client_v0::SpendOOBState::Success => {}
                fedimint_mint_client_v0::SpendOOBState::Refunded => {}
                fedimint_mint_client_v0::SpendOOBState::UserCanceledFailure => {
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
    async fn root_secret(&self) -> DerivableSecret {
        get_client_root_secret::<Bip39RootSecretStrategy>(self.client.db()).await
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

    /// Sign LNURL message using a key derived from client secret
    pub async fn sign_lnurl_message(&self, msg: &Message) -> RpcSignedLnurlMessage {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret().await;
        let lnurl_secret = root_secret.child_key(ChildId(LNURL_CHILD_ID));
        let lnurl_keypair = lnurl_secret.to_secp_key(&secp);
        let lnurl_pubkey = lnurl_keypair.public_key();
        let signature = secp.sign_ecdsa(msg, &lnurl_keypair.secret_key());
        RpcSignedLnurlMessage {
            signature,
            pubkey: RpcPublicKey(lnurl_pubkey),
        }
    }

    /// Returns an XMPP password derived from client secret. This enables
    /// recovery of XMPP account after recovering wallet.
    pub async fn get_xmpp_credentials(&self) -> RpcXmppCredentials {
        let root_secret = self.root_secret().await;
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
        let now = fedimint_core_v0::time::now();

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
        self.task_group
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
                        fedimint_core_v0::task::sleep(Duration::from_secs(10)).await;
                    }
                },
            )
            .await;
    }

    /// Send balance update every 5 seconds
    ///
    /// This is only necessary because balance subscriptions were unreliable for
    /// the v0 client. FederationV1 doesn't have this method because balance
    /// subscriptions should be reliable.
    async fn poll_balance(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} balance poller", federation.federation_name()),
                |task_handle| async move {
                    loop {
                        // TODO: select!
                        if task_handle.is_shutting_down() {
                            return;
                        }
                        federation.send_federation_event().await;
                        fedimint_core_v0::task::sleep(Duration::from_secs(5)).await;
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
        let outcome = log_entry.outcome::<LnPayState>();

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

    /// Return all transactions in DB
    pub async fn list_transactions(&self, limit: usize) -> Vec<RpcTransaction> {
        let futures = self.client.get_operations(limit).await.into_iter().map(
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
                            amount: RpcAmount(
                                Amount {
                                    msats: invoice.amount_milli_satoshis().unwrap(),
                                }
                                .translate(),
                            ),
                            direction: RpcTransactionDirection::Send,
                            notes,
                            onchain_state: None,
                            bitcoin: None,
                            ln_state: RpcLnState::from_ln_pay_state(
                                self.get_ln_pay_outcome(op.0.operation_id, op.1)
                                    .await
                                    .translate(),
                            ),
                            lightning: Some(RpcLightningDetails {
                                invoice: invoice.to_string(),
                                fee: None, // TODO: to be implemented on the fedimint side
                            }),
                            oob_state: None,
                            onchain_withdrawal_details: None,
                            stability_pool_state: None,
                        }),
                        LightningMeta::Receive { invoice, .. } => Some(RpcTransaction {
                            id: op.0.operation_id.to_string(),
                            created_at: to_unix_time(op.0.creation_time)
                                .expect("unix time should exist"),
                            amount: RpcAmount(
                                Amount {
                                    msats: invoice.amount_milli_satoshis().unwrap(),
                                }
                                .translate(),
                            ),
                            direction: RpcTransactionDirection::Receive,
                            notes,
                            onchain_state: None,
                            bitcoin: None,
                            ln_state: RpcLnState::from_ln_recv_state(
                                op.1.outcome::<LnReceiveState>().translate(),
                            ),
                            lightning: Some(RpcLightningDetails {
                                invoice: invoice.to_string(),
                                fee: None, // TODO: to be implemented on the fedimint side
                            }),
                            oob_state: None,
                            onchain_withdrawal_details: None,
                            stability_pool_state: None,
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
                                        amount: RpcAmount(mint_meta.amount.translate()),
                                        lightning: None,
                                        oob_state: None,
                                        onchain_withdrawal_details: None,
                                        stability_pool_state: None,
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
                                amount: RpcAmount(requested_amount.translate()),
                                lightning: None,
                                oob_state: self
                                    .get_oob_spend_outcome(op.0.operation_id, op.1)
                                    .await
                                    .map(RpcOOBState::from_spend_v0),
                                onchain_withdrawal_details: None,
                                stability_pool_state: None,
                            }),
                        }
                    }
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

    pub async fn save_xmpp_username(&self, username: &str) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&XmppUsernameKey, &username.to_owned())
            .await;
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
            .expect("invite code must be present")
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
}
