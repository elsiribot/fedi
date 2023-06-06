use std::{collections::HashMap, default::Default, str::FromStr, sync::Arc, time::Duration};

use fedi_social_client::{common::VerificationDocument, FediSocialClientGen, RecoveryId};
use fedimint_client::{
    backup::Metadata, db::ChronologicalOperationLogKey, get_client_root_secret, sm::OperationId,
    ClientBuilder, ClientSecret, OperationLogEntry,
};
use fedimint_core::{config::FederationId, db::IDatabase, task::timeout};
use fedimint_ln_client::{
    db::LightningGatewayKey, network_to_currency, LightningClientExt, LightningClientGen,
    LightningClientModule, LightningMeta, LnPayState, LnReceiveState,
};
use fedimint_mint_client::{
    MintClientExt, MintClientGen, MintClientModule, MintMeta, MintMetaVariants,
};
use fedimint_wallet_client::{WalletClientExt, WalletClientGen};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::{
    event::{Event, TypedEventExt},
    recovery::{
        SocialRecoveryApproval, SocialRecoveryIdKey, SocialRecoveryQr, SocialRecoveryStateKey,
    },
    social::{
        RecoveryFile, SocialBackup, SocialRecovery, SocialRecoveryState, SocialVerification,
        UserSeedPhrase, SOCIAL_RECOVERY_SECRET_CHILD_ID,
    },
    storage::{
        FederationConnectInfo, FediClientConfigKey, JoinedFederation, JoinedFederationsPrefix,
        LastBackupTimestamp, Storage, XmppUsername,
    },
    tx::{Transaction, TransactionDirection, TransactionKey, TransactionKeyPrefix},
    types::{
        self, federation_to_fedimint_federation, FediConfig, LnurlSignedMessage,
        PayInvoiceResponse, XmppCredentials,
    },
    utils::display_currency,
    EventSink,
};
use anyhow::{anyhow, bail, Context, Result};
use bitcoin::{
    secp256k1::{Message, PublicKey, Secp256k1},
    Network,
};
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_core::api::{GlobalFederationApi, WsClientConnectInfo, WsFederationApi};
use fedimint_core::{config::ClientConfig, Amount, PeerId, TieredMulti};
use fedimint_core::{db::DatabaseTransaction, task::TaskGroup};
use fedimint_derive_secret::{ChildId, DerivableSecret};
use futures::StreamExt;
use lightning_invoice::Invoice;

use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

// Client NG
use fedimint_client::Client as ClientNg;

// const GAP_LIMIT: usize = 100;
pub const XMPP_CHILD_ID: ChildId = ChildId(10);
pub const XMPP_PASSWORD: ChildId = ChildId(0);
pub const XMPP_KEYPAIR_SEED: ChildId = ChildId(1);
pub const LNURL_CHILD_ID: ChildId = ChildId(11);
pub const ONE_YEAR: Duration = Duration::from_secs(31560000);
// Backup twice per day
pub const BACKUP_FREQUENCY: Duration = Duration::from_secs(12 * 60 * 60);
const PAY_INVOICE_TIMEOUT: Duration = Duration::from_secs(90);

#[derive(Serialize, Deserialize)]
struct FediBackupMetadata {
    username: Option<String>,
}

impl FediBackupMetadata {
    fn new(username: Option<String>) -> Self {
        Self { username }
    }
}

/// override 127.0.0.1 if we're on android or ios
pub fn override_localhost(url: &Url) -> Url {
    let fedi_localhost: Option<&'static str> = option_env!("FEDI_LOCALHOST");
    if let Some(fedi_localhost) = fedi_localhost {
        let url = Url::from_str(&url.to_string().replace("127.0.0.1", fedi_localhost)).unwrap();
        info!("override localhost {:?}", url);
        url
    } else {
        url.clone()
    }
}

fn required_threashold_of(n: usize) -> usize {
    n - ((n - 1) / 3)
}

/// Load federations from storage
async fn load_federations(
    storage: &Storage,
    event_sink: EventSink,
    task_group: &TaskGroup,
) -> anyhow::Result<Vec<Federation>> {
    let db = storage.global_db().await?;
    let mut dbtx = db.begin_transaction().await;
    let joined = dbtx
        .find_by_prefix(&JoinedFederationsPrefix)
        .await
        .collect::<Vec<_>>()
        .await;
    let iter = joined.iter().map(|(federation_id, _)| async {
        let subgroup = task_group.make_subgroup().await;
        Federation::from_db(
            storage.federation_db(&federation_id.0).await?,
            event_sink.clone(),
            subgroup,
        )
        .await
    });
    futures::future::try_join_all(iter).await
}

/// This is instantiated once as a global. When RPC commands come in, this struct is used as a router to look up the federation and handle the RPC command using it.
pub struct Bridge {
    pub storage: Storage,
    pub federations: Arc<Mutex<HashMap<FederationId, Arc<Federation>>>>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
}

impl Bridge {
    pub async fn new(storage: Storage, event_sink: EventSink) -> anyhow::Result<Self> {
        // load federations from disk
        let task_group = TaskGroup::new();
        let mut federations_map = HashMap::new();
        let federations_vec = load_federations(&storage, event_sink.clone(), &task_group).await?;

        for federation in federations_vec.into_iter() {
            info!("bridge loading {:?}", federation.federation_id());
            federations_map.insert(federation.federation_id(), Arc::new(federation));
        }

        let bridge = Self {
            storage,
            federations: Arc::new(Mutex::new(federations_map)),
            task_group,
            event_sink,
        };
        Ok(bridge)
    }

    /// Check if we've already joined a federation corresponding to a connection string
    pub async fn already_joined_federation(
        &self,
        connect_string: String,
    ) -> Result<Option<Arc<Federation>>> {
        let mut connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        connect_cfg.url = override_localhost(&connect_cfg.url);
        let api = WsFederationApi::from_connect_info(&[connect_cfg.clone()]);
        let cfg: ClientConfig = api.download_client_config(&connect_cfg).await?;
        let federations = self.federations.lock().await;
        let federation = federations.get(&cfg.federation_id).map(|fed| fed.clone());
        Ok(federation)
    }

    /// Joins federation from connection string
    ///
    /// Federation ID saved to global database, new rocksdb database created for it, and it is saved to local hashmap by ID
    pub async fn join_federation(&self, connect_string: String) -> Result<Arc<Federation>> {
        // If we've already joined, return the federation we have and skip joining
        if let Some(federation) = self
            .already_joined_federation(connect_string.clone())
            .await?
        {
            return Ok(federation);
        }
        let federation = Federation::join(
            connect_string,
            &self.storage,
            self.event_sink.clone(),
            self.task_group.make_subgroup().await,
        )
        .await?;
        let federation_id = federation.federation_id();
        {
            let global_db = self.storage.global_db().await?;
            let mut dbtx = global_db.begin_transaction().await;
            dbtx.insert_entry(&JoinedFederation(federation_id), &())
                .await;
            dbtx.commit_tx().await;
            info!("joined {federation_id} in global database")
        }
        let mut federations = self.federations.lock().await;
        if !federations.contains_key(&federation_id) {
            federations.insert(federation_id, Arc::new(federation.clone()));
        };
        Ok(Arc::new(federation))
    }

    /// Look up federation by id from in-memory hashmap
    pub async fn get_federation(&self, federation_id: &FederationId) -> Option<Arc<Federation>> {
        let lock = self.federations.lock().await;
        lock.get(federation_id).map(|federation| federation.clone())
    }

    /// Deletes federation client database and config
    ///
    /// FIXME: global db transaction might fail causing us to get into inconsistent state
    pub async fn leave_federation(&self, federation_id: &FederationId) -> anyhow::Result<()> {
        // shut down state machines
        {
            let federation = self.get_federation(federation_id).await.unwrap();
            federation
                .task_group
                .clone()
                .shutdown_join_all(Some(Duration::from_secs(10)))
                .await?;
        }

        // delete federation from global db
        let global_db = self.storage.global_db().await?;
        let mut dbtx = global_db.begin_transaction().await;
        dbtx.remove_entry(&JoinedFederation(federation_id.clone()))
            .await;
        dbtx.commit_tx().await;

        // Remove from bridge state
        {
            let mut lock = self.federations.lock().await;
            lock.remove(federation_id);
        }

        // delete federation db
        self.storage.delete_federation_db(federation_id).await?;

        Ok(())
    }

    /// Restore state of a joined federation from a mnemonic
    pub async fn restore_federation(
        &self,
        federation_id: FederationId,
        mnemonic: bip39::Mnemonic,
    ) -> anyhow::Result<Arc<Federation>> {
        let mut federations = self.federations.lock().await;
        let (config, event_sink, client) = match federations.remove(&federation_id) {
            Some(federation) => {
                if federation.ng_balance().await > fedimint_core::Amount::from_sats(100) {
                    bail!("Cannot restore from backup if current balance exceeds 100 sats")
                }
                // wipe database
                info!("wiping database");
                federation.ng.wipe_state().await?;
                let config = federation.get_config().await?;
                let event_sink = federation.event_sink.clone();
                federation
                    .task_group
                    .clone()
                    .shutdown_join_all(Some(Duration::from_secs(10)))
                    .await?;
                let client: ClientNg = federation.ng.as_ref().clone();
                drop(federation);
                (config, event_sink, client)
            }
            None => bail!("Cannot restore a federation we haven't joined"),
        };

        let federation = Federation::from_mnemonic(
            mnemonic,
            config,
            client,
            event_sink,
            self.task_group.make_subgroup().await,
        )
        .await?;

        let federation_arc = Arc::new(federation);
        federations.insert(federation_id, federation_arc.clone());

        // FIXME: where to do this?
        federation_arc.ng.await_restore_finished().await?;

        Ok(federation_arc)
    }
}

/// Federation is a wrapper of "client ng" to assist with handling RPC commands
#[derive(Clone)]
pub struct Federation {
    pub ng: Arc<ClientNg>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
}

impl Federation {
    /// Instantiate Federation from a federation-specific database
    pub async fn from_db(
        db: Box<dyn IDatabase>,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> anyhow::Result<Self> {
        let dbtx = db.begin_transaction().await;
        let notifications = Default::default();
        let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
        let config = dbtx
            .get_value(&FediClientConfigKey)
            .await
            .context("config not present in db")?
            .to_string();
        let fedi_config: FediConfig = serde_json::from_str(&config).context("invalid config")?;
        dbtx.commit_tx().await;
        Self::from_config(fedi_config, db, event_sink, task_group).await
    }

    /// Instantiate Federation from FediConfig
    fn build_client_builder(config: FediConfig, db: Box<dyn IDatabase>) -> ClientBuilder {
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen);
        client_builder.with_module(FediSocialClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(config.client_config.clone());
        client_builder.with_dyn_database(db);
        client_builder
    }

    /// Instantiate Federation from FediConfig
    fn build_client_builder_from_client(config: FediConfig, client: ClientNg) -> ClientBuilder {
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen);
        client_builder.with_module(FediSocialClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(config.client_config.clone());
        client_builder.with_old_client_database(client);
        client_builder
    }

    /// Instantiate Federation by recovering mnemonic
    pub async fn from_mnemonic(
        mnemonic: bip39::Mnemonic,
        config: FediConfig,
        client: ClientNg,
        event_sink: EventSink,
        mut task_group: TaskGroup,
    ) -> anyhow::Result<Self> {
        let client_builder = Self::build_client_builder_from_client(config.clone(), client);
        // TODO: do something with this metadata
        let secret = ClientSecret::<Bip39RootSecretStrategy>::new(mnemonic);
        let (ng, metadata) = client_builder
            .build_restoring_from_backup::<Bip39RootSecretStrategy>(&mut task_group, secret)
            .await?;

        // Pass username to contructor if one if found in backup metadata
        let username = if let Ok(fedi_backup_metadata) =
            metadata.to_json_deserialized::<FediBackupMetadata>()
        {
            fedi_backup_metadata.username
        } else {
            None
        };

        let federation = Self::new(Arc::new(ng), event_sink, task_group, username).await;

        Ok(federation)
    }

    /// Constructor which starts a bunch of async tasks and ensures username is saved to db (e.g. after recovery)
    pub async fn new(
        ng: Arc<ClientNg>,
        event_sink: EventSink,
        task_group: TaskGroup,
        username: Option<String>,
    ) -> Self {
        let mut federation = Self {
            ng,
            event_sink,
            task_group,
        };
        // Save username to db if we found one
        // We want to do this before we start the listeners which is why it's here
        if let Some(username) = username {
            federation.set_username(username).await
        };
        federation.subscribe_balance_updates().await;
        federation.poll_balance().await;
        federation.poll_scheduled_backups().await;
        federation
    }

    /// Instantiate Federation from FediConfig
    pub async fn from_config(
        config: FediConfig,
        db: Box<dyn IDatabase>,
        event_sink: EventSink,
        mut task_group: TaskGroup,
    ) -> anyhow::Result<Self> {
        let client_builder = Self::build_client_builder(config.clone(), db);
        let ng = client_builder
            .build::<Bip39RootSecretStrategy>(&mut task_group)
            .await?;
        Ok(Self::new(Arc::new(ng), event_sink, task_group, None).await)
    }

    /// Download federation configs using a "connection string". Save client config to correct
    /// database with Storage.
    pub async fn join(
        connect_string: String,
        storage: &Storage,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Result<Self> {
        // Download federation config
        let mut connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        connect_cfg.url = override_localhost(&connect_cfg.url);
        let api = WsFederationApi::from_connect_info(&[connect_cfg.clone()]);
        let mut client_config: ClientConfig = api.download_client_config(&connect_cfg).await?;

        // hack for local testing
        client_config.api_endpoints = client_config
            .api_endpoints
            .into_iter()
            .map(|(peer_id, mut peer_url)| {
                peer_url.url = override_localhost(&peer_url.url);
                (peer_id, peer_url)
            })
            .collect();

        let fedi_config = FediConfig { client_config };
        let federation_id: FederationId = fedi_config.client_config.federation_id.clone();

        // Save config to db
        let dyn_db = storage.federation_db(&federation_id).await?;
        let dbtx = dyn_db.begin_transaction().await;
        let notifications = Default::default();
        let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
        {
            tracing::info!("saving config and join code");
            dbtx.insert_entry(&FediClientConfigKey, &serde_json::to_string(&fedi_config)?)
                .await;
            dbtx.insert_entry(&FederationConnectInfo, &connect_string)
                .await;
            dbtx.commit_tx().await;
            tracing::info!("saved config");
        }
        // TODO: delete the database if failed

        tracing::info!("loading client");
        Self::from_config(fedi_config, dyn_db, event_sink, task_group).await
    }

    /// Fetch config from database
    pub async fn get_config(&self) -> Result<FediConfig> {
        let config = self
            .dbtx()
            .await
            .get_value(&FediClientConfigKey)
            .await
            .context("config not present in db")?
            .to_string();
        let fedi_config: FediConfig = serde_json::from_str(&config).context("invalid config")?;
        Ok(fedi_config)
    }

    // Fetch which network we're using
    pub fn get_network(&self) -> Network {
        self.ng.get_network()
    }

    /// Fetch connect info we used to join this federation from the database
    pub async fn get_connect_info(&self) -> Result<String> {
        let connect_info = self
            .dbtx()
            .await
            .get_value(&FederationConnectInfo)
            .await
            .context("join code not present in db")?
            .to_string();
        Ok(connect_info)
    }

    /// Get federation name
    fn name(&self) -> Option<String> {
        self.ng.get_meta("federation_name")
    }

    /// Get federation ID
    pub fn federation_id(&self) -> FederationId {
        self.ng.federation_id()
    }

    /// Create database transaction
    pub async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.ng.db().begin_transaction().await
    }

    /// Get client root secret
    async fn root_secret(&self) -> DerivableSecret {
        get_client_root_secret::<Bip39RootSecretStrategy>(self.ng.db()).await
    }

    /// Fetch mnemonic from database
    pub async fn get_mnemonic(&self) -> bip39::Mnemonic {
        self.ng
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

    /// backup all state and username as metadata with the federation
    pub async fn backup(&self) -> Result<()> {
        let backup = FediBackupMetadata::new(self.get_username().await);
        let username = self.get_username().await;
        info!("backupz: {username:?}");
        self.ng
            .backup_to_federation(Metadata::from_json_serialized(backup))
            .await?;
        Ok(())
    }

    /// Background task which does a backup with the federation twice per day
    async fn poll_scheduled_backups(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} scheduled backups", federation.name()),
                |_| async move {
                    loop {
                        if let Err(e) = federation.scheduled_backup().await {
                            warn!("Error executing scheduled backup {e:?}");
                        }
                        // We check if a backup is due every 60 seconds
                        fedimint_core::task::sleep(Duration::from_secs(60)).await;
                    }
                },
            )
            .await;
    }

    /// Execute a backup if one is due and username is present (according to db)
    pub async fn scheduled_backup(&self) -> Result<()> {
        let mut dbtx = self.dbtx().await;
        let now = fedimint_core::time::now();
        // Backup is due
        if let Some(last_backup) = dbtx.get_value(&LastBackupTimestamp).await {
            if now.duration_since(last_backup)? < BACKUP_FREQUENCY {
                return Ok(());
            }
        };
        // Username is present
        if self.get_username().await.is_none() {
            return Ok(());
        }
        self.backup().await?;
        dbtx.insert_entry(&LastBackupTimestamp, &now).await;
        dbtx.commit_tx().await;
        info!("Finished periodic backup");
        Ok(())
    }

    /// Fetch balance
    pub async fn ng_balance(&self) -> fedimint_core::Amount {
        let (mint_client, _) = self
            .ng
            .get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
        let summary = mint_client
            .get_wallet_summary(&mut self.ng.db().begin_transaction().await.with_module_prefix(1))
            .await;
        summary.total_amount()
    }

    /// Receive ecash
    pub async fn ng_receive_ecash(
        &self,
        ecash: TieredMulti<fedimint_mint_client::SpendableNote>,
    ) -> Result<Amount> {
        let amount = ecash.total_amount();
        // TODO: include metadata as 2nd argument
        let operation_id = self.ng.reissue_external_notes(ecash, ()).await?;
        // not saving operation id
        let mut updates = self
            .ng
            .subscribe_reissue_external_notes_updates(operation_id)
            .await
            .unwrap()
            .into_stream();

        // TODO: run in background
        // TODO: spawn again on startup
        while let Some(update) = updates.next().await {
            if let fedimint_mint_client::ReissueExternalNotesState::Failed(e) = update {
                return Err(anyhow::Error::msg(format!("Reissue failed: {e}")));
            }

            info!("Update: {:?}", update);
        }
        self.ng_save_incoming_ecash_tx(amount).await;
        Ok(amount)
    }

    /// Generate ecash
    pub async fn ng_generate_ecash(
        &self,
        amount: Amount,
    ) -> Result<TieredMulti<fedimint_mint_client::SpendableNote>> {
        let (_, notes) = self.ng.spend_notes(amount, ONE_YEAR, ()).await?;
        let amount = notes.total_amount();
        self.ng_save_outgoing_ecash_tx(amount).await;
        Ok(notes)
    }

    /// Generate lightning invoice
    pub async fn ng_generate_invoice(
        &self,
        amount: fedimint_core::Amount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<(OperationId, Invoice)> {
        let (operation_id, invoice) = self
            .ng
            .create_bolt11_invoice(amount, description, expiry_time)
            .await?;

        self.ng_subscribe_invoice(operation_id.clone(), invoice.clone())
            .await?;

        Ok((operation_id, invoice))
    }

    /// Subscribe to state updates for a given lightning invoice
    pub async fn ng_subscribe_invoice(
        &self,
        operation_id: OperationId,
        invoice: Invoice, // TODO: fetch the invoice from the db
    ) -> Result<()> {
        let fed = self.clone();
        self.task_group
            .clone()
            .spawn("await invoice", move |_| async move {
                let mut updates = fed
                    .ng
                    .subscribe_to_ln_receive_updates(operation_id)
                    .await
                    .unwrap() // FIXME
                    .into_stream();
                while let Some(update) = updates.next().await {
                    info!("Update: {:?}", update);
                    match update {
                        LnReceiveState::Claimed => {
                            fed.ng_save_incoming_lightning_tx(&invoice).await;
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

    /// Start background task to listen for balance updates and emit "federation" events when one is observed
    async fn subscribe_balance_updates(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} balance subscription", federation.name()),
                |_| async move {
                    let mut updates = federation.ng.subscribe_balance_changes().await;
                    while let Some(_) = updates.next().await {
                        federation.send_federation_event().await;
                    }
                },
            )
            .await;
    }

    /// Send balance update every 5 seconds
    async fn poll_balance(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} balance poller", federation.name()),
                |_| async move {
                    loop {
                        federation.send_federation_event().await;
                        fedimint_core::task::sleep(Duration::from_secs(5)).await;
                    }
                },
            )
            .await;
    }

    async fn override_active_gateway(&self) -> Result<()> {
        let (_lightning, instance) = self
            .ng
            .get_first_module::<LightningClientModule>(&fedimint_ln_client::KIND);
        let mut dbtx = instance.db.begin_transaction().await;

        let mut gateway = self.ng.select_active_gateway().await?;
        gateway.api = override_localhost(&gateway.api);
        dbtx.insert_entry(&LightningGatewayKey, &gateway).await;
        dbtx.commit_tx().await;

        Ok(())
    }

    /// Pay lightning invoice
    pub async fn ng_pay_invoice(&self, invoice: &Invoice) -> Result<PayInvoiceResponse> {
        self.override_active_gateway().await?;

        self.can_pay_invoice(invoice).await?;

        let federation_id = self.federation_id();
        let operation_id = self
            .ng
            .pay_bolt11_invoice(federation_id, invoice.to_owned())
            .await?;

        let response = self
            .subscibe_to_ln_pay(operation_id, invoice.clone())
            .await?;

        return Ok(response);
    }

    /// Subscribe to updates on all active operations
    ///
    /// This currently doesn't have a way to filter out in-active operations ...
    pub async fn subscribe_to_all_operation(&self) -> Result<()> {
        // FIXME: paginate this ...
        let operations = self.ng.get_operations(100).await;
        for (log_key, _log_entry) in operations.iter() {
            self.subscribe_to_operation(log_key.operation_id).await?;
        }

        Ok(())
    }

    /// Called after starting client or after spawning new state machine
    pub async fn subscribe_to_operation(&self, operation_id: OperationId) -> Result<()> {
        // get operation
        let operation = self
            .ng
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
                            fed.subscibe_to_ln_pay(operation_id, invoice).await
                        })
                        .await;
                }
                LightningMeta::Receive { invoice, .. } => {
                    let fed = self.clone();
                    self.task_group
                        .clone()
                        .spawn("subscribe_to_ln_receive", move |_| async move {
                            // FIXME: what happens if it fails?
                            fed.subscibe_to_ln_receive(operation_id, invoice).await
                        })
                        .await;
                }
            },
            "mint" => {
                let meta = operation.meta::<MintMeta>();
                match meta.variant {
                    MintMetaVariants::SpendOOB { .. } => {
                        debug!("can't subscribe to mint spend updates");
                        ()
                    }
                    MintMetaVariants::Reissuance { .. } => {
                        let fed = self.clone();
                        self.task_group
                            .clone()
                            .spawn("subscribe_to_ecash_reissue", move |_| async move {
                                // FIXME: what happens if it fails?
                                fed.subscribe_to_ecash_reissue(operation_id, meta.amount)
                                    .await
                            })
                            .await;
                    }
                }
            }
            // FIXME: should I return an error or just log something?
            _ => {
                return Err(anyhow!(format!(
                    "unknown operation type: {}",
                    operation.operation_type()
                )))
            }
        }
        // match on operation kind, call the right listener (e.g. ecash or lightning etc)
        // listeners emit events to frontend on every state transition
        Ok(())
    }

    pub async fn subscibe_to_ln_pay(
        &self,
        operation_id: OperationId,
        invoice: Invoice,
    ) -> Result<PayInvoiceResponse> {
        let mut updates = self
            .ng
            .subscribe_ln_pay_updates(operation_id)
            .await?
            .into_stream();

        match timeout(PAY_INVOICE_TIMEOUT, async {
            while let Some(update) = updates.next().await {
                self.ng_save_outgoing_lightning_tx(&invoice, Some(update.clone()))
                    .await;
                match update {
                    LnPayState::Success { preimage } => {
                        return Ok(PayInvoiceResponse { preimage });
                    }
                    LnPayState::Refunded { gateway_error } => {
                        return Err(gateway_error.into());
                    }
                    _ => {}
                };
                info!("lightning update: {:?}", update);
            }
            Err(anyhow!("lightning payment failed"))
        })
        .await
        {
            Ok(result) => result,
            Err(_) => bail!("Lightning payment failed ... awaiting refund"),
        }
    }

    pub async fn subscibe_to_ln_receive(
        &self,
        operation_id: OperationId,
        invoice: Invoice, // TODO: fetch the invoice from the db
    ) -> Result<()> {
        let mut updates = self
            .ng
            .subscribe_to_ln_receive_updates(operation_id)
            .await
            .expect("failed to subscribe to updates")
            .into_stream();
        while let Some(update) = updates.next().await {
            info!("Update: {:?}", update);
            match update {
                LnReceiveState::Claimed => {
                    self.ng_save_incoming_lightning_tx(&invoice).await;
                }
                LnReceiveState::Canceled { .. } => {
                    // TODO: send message that it failed, save to db
                    // return Err(reason.into());
                }
                _ => {}
            }
        }
        Ok(())
    }

    pub async fn subscribe_to_ecash_reissue(
        &self,
        operation_id: OperationId,
        amount: Amount,
    ) -> Result<()> {
        let mut updates = self
            .ng
            .subscribe_reissue_external_notes_updates(operation_id)
            .await?
            .into_stream();

        while let Some(update) = updates.next().await {
            if let fedimint_mint_client::ReissueExternalNotesState::Failed(e) = update {
                // FIXME: save a failed transaction to the database
                return Err(anyhow::Error::msg(format!("Reissue failed: {e}")));
            }

            info!("Update: {:?}", update);
        }
        self.ng_save_incoming_ecash_tx(amount).await;

        Ok(())
    }

    /// Switch active lightning gateway
    pub async fn ng_switch_gateway(&self, pubkey: PublicKey) -> Result<()> {
        self.ng.set_active_gateway(&pubkey).await?;
        Ok(())
    }

    /// Fetch operation history. This isn't really used yet.
    pub async fn ng_history(
        &self,
    ) -> Result<Vec<(ChronologicalOperationLogKey, OperationLogEntry)>> {
        let ops = self.ng.get_operations(100).await;
        Ok(ops)
    }

    // FIXME: remove this
    pub async fn ng_save_outgoing_lightning_tx(
        &self,
        invoice: &Invoice,
        ln_pay_state: Option<LnPayState>,
    ) {
        let amount = fedimint_core::Amount::from_msats(
            invoice
                .amount_milli_satoshis()
                .expect("assuming we only receive payments for invoices with amount"),
        );
        let fee = None;
        let tx = Transaction::lightning(
            TransactionDirection::Send,
            amount,
            fee,
            invoice.clone(),
            ln_pay_state,
        );
        self.save_transaction(&tx, true).await;
    }

    // FIXME: remove this
    pub async fn ng_save_incoming_lightning_tx(&self, invoice: &Invoice) {
        let amount = fedimint_core::Amount::from_msats(
            invoice
                .amount_milli_satoshis()
                .expect("assuming we only receive payments for invoices with amount"),
        );
        let fee = None;
        let tx = Transaction::lightning(
            TransactionDirection::Receive,
            amount,
            fee,
            invoice.clone(),
            None,
        );
        self.save_transaction(&tx, true).await;
    }

    // FIXME: remove this
    pub async fn ng_save_outgoing_ecash_tx(&self, amount: fedimint_core::Amount) {
        let tx = Transaction::offline(TransactionDirection::Send, amount);
        self.save_transaction(&tx, true).await;
    }

    // FIXME: remove this
    pub async fn ng_save_incoming_ecash_tx(&self, amount: fedimint_core::Amount) {
        let tx = Transaction::offline(TransactionDirection::Receive, amount);
        self.save_transaction(&tx, true).await;
    }

    //
    // Authentication & cryptography
    //

    pub async fn get_username(&self) -> Option<String> {
        self.dbtx().await.get_value(&XmppUsername).await
    }

    pub async fn set_username(&self, username: String) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&XmppUsername, &username).await;
        dbtx.commit_tx().await;
    }

    /// Sign LNURL message using a key derived from client secret
    /// TODO: use different key per "site"
    pub async fn sign_lnurl_message(&self, msg: &Message) -> LnurlSignedMessage {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret().await;
        let lnurl_secret = root_secret.child_key(LNURL_CHILD_ID);
        let lnurl_keypair = lnurl_secret.to_secp_key(&secp);
        let lnurl_pubkey = lnurl_keypair.public_key();
        let signature = secp.sign_ecdsa(msg, &lnurl_keypair.secret_key());
        LnurlSignedMessage {
            signature,
            pubkey: types::PublicKey(lnurl_pubkey),
        }
    }

    /// Returns an XMPP password derived from client secret. This enables recovery of XMPP account
    /// after recovering wallet.
    pub async fn xmpp_credentials(&self) -> XmppCredentials {
        let root_secret = self.root_secret().await;
        let xmpp_secret = root_secret.child_key(XMPP_CHILD_ID);
        let password_bytes: [u8; 16] = xmpp_secret.child_key(XMPP_PASSWORD).to_random_bytes();
        let keypair_seed_bytes: [u8; 32] =
            xmpp_secret.child_key(XMPP_KEYPAIR_SEED).to_random_bytes();
        let username = self.get_username().await;

        XmppCredentials {
            password: hex::encode(&password_bytes),
            keypair_seed: hex::encode(&keypair_seed_bytes),
            username,
        }
    }

    /// Check whether lightning invoice is safe to pay
    pub async fn can_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        // Has an amount
        if invoice.amount_milli_satoshis().is_none() {
            return Err(anyhow!("Invoice is missing amount"));
        }

        // Same network
        if network_to_currency(self.get_network()) != invoice.currency() {
            return Err(anyhow!(format!(
                "Invoice is for wrong network. Expected {}, got {}",
                self.get_network(),
                display_currency(invoice.currency())
            )));
        }

        Ok(())
    }

    /// Save transaction to DB
    /// `send_event` is whether to send event to react native, which might send push notifications
    pub async fn save_transaction(&self, tx: &Transaction, send_event: bool) {
        // TODO: need to expose the database
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&TransactionKey(tx.id.clone()), tx).await;
        dbtx.commit_tx().await;
        // notify UI
        if send_event {
            self.send_transaction_event(&tx);
        }
    }

    /// Get transaction from DB
    pub async fn get_transaction(&self, id: String) -> Option<Transaction> {
        self.dbtx().await.get_value(&TransactionKey(id)).await
    }

    /// Update "notes" on existing transaction record in the DB
    /// FIXME: improve this "id" arg
    pub async fn update_transaction_notes(&self, id: String, notes: String) -> Result<()> {
        match self.get_transaction(id).await {
            Some(mut tx) => {
                tx.notes = notes;
                self.save_transaction(&tx, false).await;
                Ok(())
            }
            None => Err(anyhow!("Transaction not found")),
        }
    }

    /// Return all transactions in DB
    pub async fn list_transactions(&self) -> Vec<Transaction> {
        let mut transactions: Vec<Transaction> = self
            .dbtx()
            .await
            .find_by_prefix(&TransactionKeyPrefix)
            .await
            .map(|res| res.1)
            .collect()
            .await;
        // Sort by timestamp, descending
        transactions.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        transactions
    }

    //
    // Events
    //

    /// Send whenever the balance or social recovery state changes
    pub async fn send_federation_event(&self) {
        // FIXME: should handle this result
        let fedimint_federation =
            match federation_to_fedimint_federation(&Arc::new(self.clone())).await {
                Ok(fedimint_federation) => fedimint_federation,
                Err(e) => {
                    warn!("Failed to send 'federation' event {:?}", e);
                    return;
                }
            };
        let event = Event::federation(fedimint_federation).await;
        self.event_sink.typed_event(&event);
    }

    /// Notify React Native that we've observed new or updated transaction
    fn send_transaction_event(&self, tx: &Transaction) {
        let event = Event::transaction(self.federation_id(), tx.clone());
        self.event_sink.typed_event(&event);
    }

    /// Generate social recovery secret from root secret
    pub fn social_recovery_secret_static(root_secret: &DerivableSecret) -> DerivableSecret {
        assert_eq!(root_secret.level(), 0);
        root_secret.child_key(SOCIAL_RECOVERY_SECRET_CHILD_ID)
    }

    // Create social backup client
    pub async fn social_backup(&self) -> Result<SocialBackup> {
        let (module_id, cfg) = self
            .get_config()
            .await?
            .client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialBackup {
            module_secret: Self::social_recovery_secret_static(&self.root_secret().await),
            module_id,
            config: cfg,
            api: self.ng.dyn_api(),
        })
    }

    /// Start social recovery session
    pub async fn social_recovery_start(
        &self,
        recovery_file: RecoveryFile,
    ) -> anyhow::Result<SocialRecovery> {
        let (module_id, cfg) = self
            .get_config()
            .await?
            .client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        SocialRecovery::new_start(module_id, cfg, self.ng.dyn_api(), recovery_file)
    }

    /// Continue social recovery session
    pub async fn social_recovery_continue_inner(
        &self,
        prev_state: SocialRecoveryState,
    ) -> Result<SocialRecovery> {
        let (module_id, cfg) = self
            .get_config()
            .await?
            .client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialRecovery::new_continue(
            module_id,
            cfg,
            self.ng.dyn_api(),
            prev_state,
        ))
    }

    /// Attempt to continue a previous social recovery session by loading state from DB
    pub async fn social_recovery_continue(&self) -> Result<SocialRecovery> {
        let mut dbtx = self.dbtx().await;
        let state = dbtx
            .get_value(&SocialRecoveryStateKey(self.federation_id()))
            .await
            .ok_or(anyhow!("no active recovery session"))?;
        Ok(self.social_recovery_continue_inner(state).await?)
    }

    /// Get social verification client for a guardian
    pub async fn social_verification(&self, peer_id: PeerId) -> Result<SocialVerification> {
        let (module_id, _cfg) = self
            .get_config()
            .await?
            .client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialVerification::new(
            module_id,
            self.ng.dyn_api(),
            peer_id,
        ))
    }

    /// Upload social recovery recovery file to federation given a recovery video
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

    /// Save social recovery session state to the DB
    pub async fn social_recovery_save(
        &self,
        recovery_client: &SocialRecovery,
        dbtx: &mut DatabaseTransaction<'_>,
    ) {
        // FIXME: should I pass dbtx from outside?
        dbtx.insert_entry(
            &SocialRecoveryStateKey(self.federation_id()),
            recovery_client.state(),
        )
        .await;
    }

    /// Get social recovery Id from the DB. This is used to generate the recovery QR.
    pub async fn get_social_recovery_id(&self) -> Option<types::RecoveryId> {
        self.dbtx()
            .await
            .get_value(&SocialRecoveryIdKey(self.federation_id()))
            .await
            .map(types::RecoveryId)
    }

    /// Save social recovery ID to the DB. This is used to generate the recovery QR.
    pub async fn save_social_recovery_id(
        &self,
        recovery_id: &RecoveryId,
        dbtx: &mut DatabaseTransaction<'_>,
    ) {
        dbtx.insert_entry(&SocialRecoveryIdKey(self.federation_id()), &recovery_id)
            .await;
    }

    /// Start a new social recovery session if one doesn't exist already
    /// FIXME: This will lead to bugs because if someone gets stuck inside a session there will be no way to exist
    /// Also won't be able to do simulataneous recoveries in 2 federations.
    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        let mut dbtx = self.dbtx().await;
        let recovery_client = match self.social_recovery_continue().await {
            Ok(recovery_client) => recovery_client,
            Err(_) => {
                let recovery_client = self.social_recovery_start(recovery_file.clone()).await?;
                self.social_recovery_save(&recovery_client, &mut dbtx).await;
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
            self.save_social_recovery_id(&recovery_id, &mut dbtx).await;
        }
        dbtx.commit_tx().await;
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
            .ok_or(anyhow!("No recovery ID found"))?;
        Ok(SocialRecoveryQr { recovery_id })
    }

    /// Download social recovery video to `data_dir`
    pub async fn social_recovery_download_verification_doc(
        &self,
        recovery_id: &RecoveryId,
    ) -> Result<Option<Vec<u8>>> {
        tracing::info!("downloading verificaiton doc {}", recovery_id);
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
            .get_config()
            .await?
            .client_config
            .api_endpoints
            .into_iter()
            .map(|(peer_id, endpoint)| (endpoint.name.clone(), peer_id))
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
        let mut dbtx = self.dbtx().await;
        self.social_recovery_save(&recovery_client, &mut dbtx).await;
        dbtx.commit_tx().await;

        Ok((approvals, remaining))
    }

    /// Attempt to recovery mnemonic from recovery shares available for download from the federation
    pub async fn social_recovery_combine_shares(&self) -> Result<bip39::Mnemonic> {
        let recovery_client = self.social_recovery_continue().await?;
        let seed_phrase = recovery_client.combine_recovered_user_phrase()?;
        let mnemonic = bip39::Mnemonic::parse(seed_phrase.0)?;
        Ok(mnemonic)
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
    }
}
