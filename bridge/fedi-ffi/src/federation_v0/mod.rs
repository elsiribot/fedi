mod dev;
mod utils;

use std::time::{Duration, SystemTime};
use std::{default::Default, str::FromStr, sync::Arc};

use bitcoin::secp256k1::{Message, PublicKey, Secp256k1};
use bitcoin::Network;
use fedimint_client_v0::backup::Metadata;
use fedimint_client_v0::sm::OperationId;
use fedimint_client_v0::{get_client_root_secret, ClientBuilder, ClientSecret};
use fedimint_core_v0::task::timeout;
use fedimint_core_v0::Amount;
use fedimint_core_v0::{api::GlobalFederationApi, config::FederationId, db::IDatabase};
use fedimint_derive_secret_v0::{ChildId, DerivableSecret};
use fedimint_ln_client_v0::{
    network_to_currency, LightningClientGen, LightningClientModule, LightningMeta, LnPayState,
    LnReceiveState,
};
use fedimint_mint_client_v0::{
    MintClientExt, MintClientGen, MintClientModule, MintMeta, MintMetaVariants,
    ReissueExternalNotesState,
};
use fedimint_wallet_client_v0::{WalletClientExt, WalletClientGen};
use futures::StreamExt;
use lightning_invoice::Invoice;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};
use v0_rocksdb::{FediClientConfigKey, InviteCodeKey, LastBackupTimestampKey, XmppUsernameKey};

use crate::constants::BACKUP_FREQUENCY;
use crate::types::{RpcLightningDetails, RpcLnState, RpcTransaction};
use crate::utils::{display_currency, unix_now};

use self::dev::{
    override_localhost_client_config, override_localhost_gateway, override_localhost_invite_code,
};
use self::utils::{parse_ecash, serialize_ecash};
use super::constants::{
    LNURL_CHILD_ID, ONE_YEAR, PAY_INVOICE_TIMEOUT, SHUTDOWN_TIMEOUT, XMPP_CHILD_ID,
    XMPP_KEYPAIR_SEED, XMPP_PASSWORD,
};
use super::event::EventSink;
use super::event::{Event, TypedEventExt};
use super::storage::Storage;
use super::translate::Translate;
use super::types::{
    federation_v0_to_rpc_federation, FediBackupMetadata, RpcAmount, RpcInvoice,
    RpcLightningGatewayV0, RpcPayInvoiceResponse, RpcPublicKey, RpcSignedLnurlMessage,
    RpcXmppCredentials,
};
use anyhow::{bail, Context, Result};
use fedimint_bip39_v0::Bip39RootSecretStrategy;
use fedimint_core_v0::api::{WsClientConnectInfo as InviteCode, WsFederationApi};
use fedimint_core_v0::config::ClientConfig;
use fedimint_core_v0::{db::DatabaseTransaction, task::TaskGroup};
use fedimint_ln_client_v0::LightningClientExt;

use fedimint_client_v0::Client;

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

    /// Instantiate Federation from another client
    ///
    /// This is a hack used during recovery to get a handle to the old database
    async fn build_client_builder_from_client(old_client: Client) -> ClientBuilder {
        let client_config = old_client.get_config().await.clone();
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(client_config);
        client_builder.with_old_client_database(old_client);
        client_builder
    }

    /// Constructor which starts a bunch of async tasks and ensures username is saved to db (e.g. after recovery)
    pub async fn new(ng: Arc<Client>, event_sink: EventSink, task_group: TaskGroup) -> Self {
        let mut federation = Self {
            client: ng,
            event_sink,
            task_group,
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

    /// Download federation configs using an invite code. Save client config to correct
    /// database with Storage.
    pub async fn join(
        invite_code_string: String,
        storage: &Storage,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Result<Self> {
        // Download federation config
        let mut invite_code: InviteCode = InviteCode::from_str(&invite_code_string)?;
        override_localhost_invite_code(&mut invite_code);
        let api = WsFederationApi::from_connect_info(&[invite_code.clone()]);
        let mut client_config: ClientConfig = api.download_client_config(&invite_code).await?;
        override_localhost_client_config(&mut client_config);

        // Save client config and invite code
        let federation_id: FederationId = client_config.federation_id;
        let dyn_db = storage.federation_idb_v0(&federation_id).await?;
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

    /// Return federation name from meta, or take first 8 characters of federation ID
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
        let (mint_client, _) = self
            .client
            .get_first_module::<MintClientModule>(&fedimint_mint_client_v0::KIND);
        let summary = mint_client
            .get_wallet_summary(
                &mut self
                    .client
                    .db()
                    .begin_transaction()
                    .await
                    .with_module_prefix(1),
            )
            .await;
        summary.total_amount()
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

        invoice.try_into()
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
                                direction: "receive".to_string(),
                                notes: "".into(),
                                // FIXME: map v0 to v1 states on best effort basis
                                // ln_state: RpcLnState::from_ln_recv_state(Some(update)),
                                ln_state: None,
                                lightning: Some(RpcLightningDetails {
                                    invoice: invoice.to_string(),
                                    fee: None, // TODO: to be implemented on the fedimint side
                                }),
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
                display_currency(invoice.currency())
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
                        debug!("can't subscribe to mint spend updates");
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

        match timeout(PAY_INVOICE_TIMEOUT, async {
            while let Some(update) = updates.next().await {
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
        })
        .await
        {
            Ok(result) => result,
            Err(_) => bail!("Lightning payment failed ... awaiting refund"),
        }
    }

    /// Start background task to listen for balance updates and emit "federation" events when one is observed
    async fn subscribe_balance_updates(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} balance subscription", federation.federation_name()),
                |_| async move {
                    let mut updates = federation.client.subscribe_balance_changes().await;
                    while (updates.next().await).is_some() {
                        federation.send_federation_event().await;
                    }
                },
            )
            .await;
    }

    fn send_transaction_event(&self, transaction: RpcTransaction) {
        let event = Event::transaction(self.federation_id().translate(), transaction);
        self.event_sink.typed_event(&event);
    }

    /// Send whenever the balance or social recovery state changes
    pub async fn send_federation_event(&self) {
        let rpc_federation = federation_v0_to_rpc_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(rpc_federation).await;
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

    /// Receive ecash
    /// TODO: user a better type than String
    pub async fn receive_ecash(&self, ecash: String) -> Result<Amount> {
        let ecash = parse_ecash(&ecash)?;
        let amount = ecash.total_amount();
        // TODO: include metadata as 2nd argument
        let operation_id = self.client.reissue_external_notes(ecash, ()).await?;
        self.subscribe_to_ecash_reissue(operation_id).await?;
        Ok(amount)
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
        // TODO: transaction event?

        Ok(())
    }

    /// Generate ecash
    /// FIXME: might be better to return a typed object here and serialize at RPC layer
    pub async fn generate_ecash(&self, amount: Amount) -> Result<String> {
        let (_, notes) = self.client.spend_notes(amount, ONE_YEAR, ()).await?;
        Ok(serialize_ecash(&notes))
    }

    /// Get client root secret
    async fn root_secret(&self) -> DerivableSecret {
        get_client_root_secret::<Bip39RootSecretStrategy>(self.client.db()).await
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

    /// Extract username (and potentially more in future) from recovered metadata and save it to database
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
        mut task_group: TaskGroup,
    ) -> Result<Self> {
        let client_builder = Self::build_client_builder_from_client(old_client).await;
        let secret = ClientSecret::<Bip39RootSecretStrategy>::new(mnemonic);
        let (client, metadata) = client_builder
            .build_restoring_from_backup::<Bip39RootSecretStrategy>(&mut task_group, secret)
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

    /// Returns an XMPP password derived from client secret. This enables recovery of XMPP account
    /// after recovering wallet.
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
        let now = fedimint_core::time::now();

        // Backup is due
        if let Some(last_backup) = self.get_last_backup_timestamp().await {
            if now.duration_since(last_backup)? < BACKUP_FREQUENCY {
                return Ok(());
            }
        };

        // FIXME: this potentially prevents race conditions, but degrades recovery for federations without chat
        // Username is present
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
                        fedimint_core::task::sleep(Duration::from_secs(10)).await;
                    }
                },
            )
            .await;
    }

    /// Send balance update every 5 seconds
    ///
    /// This is only necessary because balance subscriptions were unreliable for the v0 client.
    /// FederationV1 doesn't have this method because balance subscriptions should be reliable.
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
                        fedimint_core::task::sleep(Duration::from_secs(5)).await;
                    }
                },
            )
            .await;
    }

    /// Return all transactions in DB
    pub async fn list_transactions(&self) -> Vec<RpcTransaction> {
        vec![]
    }

    // Database

    pub async fn get_xmpp_username(&self) -> Option<String> {
        self.dbtx().await.get_value(&XmppUsernameKey).await
    }

    pub async fn save_xmpp_username(&self, username: &String) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&XmppUsernameKey, &username).await;
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

    pub async fn get_invite_code(&self) -> Option<String> {
        self.dbtx().await.get_value(&InviteCodeKey).await
    }
}
