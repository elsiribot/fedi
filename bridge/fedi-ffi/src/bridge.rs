use std::{
    collections::HashMap,
    default::Default,
    str::FromStr,
    sync::Arc,
    time::{Duration, SystemTime},
};

use fedi_social_client::{common::VerificationDocument, RecoveryId};
use fedimint_client::{
    db::ChronologicalOperationLogKey,
    module::gen::{ClientModuleGenRegistry, IClientModuleGen},
    sm::OperationId,
    ClientBuilder, OperationLogEntry,
};
use fedimint_client_fedi::{
    mint::backup::Metadata,
    module_gens,
    modules::{
        ln::{contracts::IdentifiableContract, LightningClientGen},
        mint::{MintClientExt, MintClientGen},
        wallet::WalletClientGen,
    },
    Client, FediClient, RecoveryFile, SocialRecovery, UserClientConfig, UserSeedPhrase,
};
use fedimint_core::{
    config::{FederationId, META_FEDERATION_NAME_KEY},
    core::LEGACY_HARDCODED_INSTANCE_ID_MINT,
    db::IDatabase,
    module::registry::ModuleDecoderRegistry,
};
use fedimint_ln_client::{LightningClientExt, LnPayState, LnReceiveState};
use fedimint_mint_client::MintClientModule;
use url::Url;

use crate::{
    event::{Event, TypedEventExt},
    mnemonic::Mnemonic,
    payment::{Payment, PaymentDirection, PaymentKey, PaymentKeyPrefix, PaymentStatus},
    recovery::{
        SocialRecoveryApproval, SocialRecoveryIdKey, SocialRecoveryQr, SocialRecoveryStateKey,
    },
    storage::{FediClientConfigKey, JoinedFederation, JoinedFederationsPrefix, Storage},
    tx::{
        self, IncomingBitcoinTransactionStatus, Transaction, TransactionDirection, TransactionKey,
        TransactionKeyPrefix,
    },
    types::{
        self, federation_to_fedimint_federation, hacky_lightning_invoice_fee, FediConfig,
        LnurlSignedMessage, XmppCredentials,
    },
    EventSink,
};
use anyhow::{anyhow, Context, Result};
use bitcoin::{
    hashes::sha256,
    secp256k1::{Message, PublicKey, Secp256k1},
    Address, Network, Script, Txid,
};
use fedimint_client_legacy::{
    api::WalletFederationApi, mint::SpendableNote, modules::ln::contracts::ContractId,
    utils::network_to_currency,
};
use fedimint_core::api::{GlobalFederationApi, WsClientConnectInfo, WsFederationApi};
use fedimint_core::task::TaskHandle;
use fedimint_core::{config::ClientConfig, Amount, PeerId, TieredMulti};
use fedimint_core::{db::DatabaseTransaction, task::TaskGroup};
use fedimint_derive_secret::ChildId;
use futures::{stream::FuturesUnordered, StreamExt};
use lightning_invoice::Invoice;

use fedimint_client_legacy::{utils::from_hex, wallet::db::PegInPrefixKey};
use tokio::sync::Mutex;
use tracing::{debug, error, info, info_span, instrument, Instrument, Span};

// Client NG
use fedimint_client::Client as ClientNg;

pub type FediUserClient = FediClient<UserClientConfig>;

// const GAP_LIMIT: usize = 100;
pub const XMPP_CHILD_ID: ChildId = ChildId(10);
pub const XMPP_PASSWORD: ChildId = ChildId(0);
pub const XMPP_KEYPAIR_SEED: ChildId = ChildId(1);

pub const LNURL_CHILD_ID: ChildId = ChildId(11);

/// override 127.0.0.1 if we're on android or ios
pub fn override_localhost(url: &Url) -> Url {
    let host = match std::env::consts::OS {
        "android" => "10.0.2.2",
        "ios" => "100.85.68.88",
        _ => "127.0.0.1",
    };
    Url::from_str(&url.to_string().replace("127.0.0.1", host)).unwrap()
}

fn required_threashold_of(n: usize) -> usize {
    n - ((n - 1) / 3)
}

fn load_decoders(
    cfg: &UserClientConfig,
    module_gens: &ClientModuleGenRegistry,
) -> ModuleDecoderRegistry {
    ModuleDecoderRegistry::new(
        cfg.clone()
            .0
            .modules
            .into_iter()
            .filter_map(|(id, module_cfg)| {
                module_gens.get(module_cfg.kind()).map(|module_gen| {
                    (
                        id,
                        module_cfg.kind().clone(),
                        IClientModuleGen::decoder(AsRef::<dyn IClientModuleGen + 'static>::as_ref(
                            module_gen,
                        )),
                    )
                })
            }),
    )
}

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
        Federation::load(
            storage.federation_db(&federation_id.0).await?,
            event_sink.clone(),
            subgroup,
        )
        .await
    });
    futures::future::try_join_all(iter).await
}

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

        // start pollers
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

    pub async fn stop_pollers(&self) -> Result<()> {
        self.task_group
            .clone()
            .shutdown_join_all(Some(Duration::from_secs(3)))
            .await
    }

    pub async fn already_joined_federation(
        &self,
        connect_string: String,
    ) -> Result<Option<Arc<Federation>>> {
        let mut connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        if std::env::consts::OS == "android" {
            connect_cfg.url = override_localhost(&connect_cfg.url);
        }
        info!("already joined federation?: {}", connect_cfg.id);
        let api = WsFederationApi::from_connect_info(&[connect_cfg.clone()]);
        let cfg: ClientConfig = api.download_client_config(&connect_cfg).await?;
        let federations = self.federations.lock().await;
        let federation = federations.get(&cfg.federation_id).map(|fed| fed.clone());
        Ok(federation)
    }

    /// Adds federation to "federations" and starts polling (if we haven't already joined)
    pub async fn join_federation(&self, connect_string: String) -> Result<Arc<Federation>> {
        // If we've already joined, return the federation we have and skip joining
        if let Some(federation) = self
            .already_joined_federation(connect_string.clone())
            .await?
        {
            return Ok(federation);
        }
        tracing::info!("joining new federation");
        let mut federation = Federation::join(
            connect_string,
            &self.storage,
            self.event_sink.clone(),
            self.task_group.make_subgroup().await,
        )
        .await?;
        let federation_id = federation.federation_id();
        tracing::info!("saving joined federaiton key");
        {
            let global_db = self.storage.global_db().await?;
            let mut dbtx = global_db.begin_transaction().await;
            dbtx.insert_entry(&JoinedFederation(federation_id), &())
                .await;
            dbtx.commit_tx().await;
            info!("saved joined")
        }
        let mut federations = self.federations.lock().await;
        tracing::info!("starting pollers");
        if !federations.contains_key(&federation_id) {
            federations.insert(federation_id, Arc::new(federation.clone()));
        };
        Ok(Arc::new(federation))
    }

    pub async fn get_federation(&self, federation_id: &FederationId) -> Option<Arc<Federation>> {
        let lock = self.federations.lock().await;
        lock.get(federation_id).map(|federation| federation.clone())
    }

    pub async fn recover_from_mnemonic(
        &self,
        federation_id: &FederationId,
        mnemonic: &Mnemonic,
    ) -> Result<Option<String>> {
        unimplemented!()
    }

    /// Deletes federation client database and config
    /// Returns error if use has a balance
    pub async fn leave_federation(&self, federation_id: &FederationId) -> anyhow::Result<()> {
        info!("called leave");
        // Error if we don't recognize federation
        let federation = self
            .get_federation(federation_id)
            .await
            .ok_or(anyhow!("Federation not found"))?;

        self.storage.delete_federation_db(federation_id).await?;

        // Remove from bridge state
        info!("removing from bridge");
        let mut lock = self.federations.lock().await;
        lock.remove(federation_id);

        info!("done");
        Ok(())
    }
}

/// Should this have the poller reference?
#[derive(Clone)]
pub struct Federation {
    // pub client: Arc<FediUserClient>,
    pub ng: Arc<ClientNg>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    pub username: Arc<Mutex<Option<String>>>,
}

impl Federation {
    pub async fn load(
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

    pub async fn from_config(
        config: FediConfig,
        db: Box<dyn IDatabase>,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> anyhow::Result<Self> {
        let gens = module_gens();

        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(config.client_config.clone().0);
        client_builder.with_dyn_database(db);

        // FIXME: use real database
        let mut task_group_clone = task_group.clone();
        let ng = client_builder.build(&mut task_group_clone).await?;

        Ok(Self {
            ng: Arc::new(ng),
            event_sink,
            task_group,
            username: Arc::new(Mutex::new(config.username)),
        })
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
        tracing::info!("parsing connection string");
        let mut connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        connect_cfg.url = override_localhost(&connect_cfg.url);
        let api = WsFederationApi::from_connect_info(&[connect_cfg.clone()]);
        tracing::info!("fetching config");
        let mut cfg: ClientConfig = api.download_client_config(&connect_cfg).await?;
        if std::env::consts::OS == "android" {
            cfg.api_endpoints = cfg
                .api_endpoints
                .into_iter()
                .map(|(peer_id, mut peer_url)| {
                    peer_url.url = override_localhost(&peer_url.url);
                    (peer_id, peer_url)
                })
                .collect();
        };

        let fedi_config = FediConfig {
            username: None,
            client_config: UserClientConfig(cfg),
        };

        let federation_id: FederationId = fedi_config.client_config.0.federation_id.clone();

        tracing::info!("loading db");
        let dyn_db = storage.federation_db(&federation_id).await?;
        tracing::info!("loadeed db");
        let dbtx = dyn_db.begin_transaction().await;
        let notifications = Default::default();
        let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
        // Save config to db
        {
            tracing::info!("saving config");
            dbtx.insert_entry(&FediClientConfigKey, &serde_json::to_string(&fedi_config)?)
                .await;
            dbtx.commit_tx().await;
            tracing::info!("saved config");
        }
        // TODO: delete the database if failed

        tracing::info!("loading client");
        Self::from_config(fedi_config, dyn_db, event_sink, task_group).await
    }

    // FIXME: don't hardcode
    fn name(&self) -> String {
        "halz trusty mint".to_string()
    }

    pub fn federation_id(&self) -> FederationId {
        self.ng.federation_id()
    }

    async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.ng.db().begin_transaction().await
    }

    pub async fn ng_balance(&self) -> fedimint_core::Amount {
        let mint_client = self
            .ng
            .get_module_client::<MintClientModule>(LEGACY_HARDCODED_INSTANCE_ID_MINT)
            .unwrap();
        let summary = mint_client
            .get_wallet_summary(&mut self.ng.db().begin_transaction().await.with_module_prefix(1))
            .await;
        summary.total_amount()
    }
    pub async fn ng_receive_ecash(
        &self,
        ecash: TieredMulti<fedimint_mint_client::SpendableNote>,
    ) -> Result<Amount> {
        let amount = ecash.total_amount();
        let operation_id = self.ng.reissue_external_notes(ecash).await?;
        let mut updates = self
            .ng
            .subscribe_reissue_external_notes_updates(operation_id)
            .await
            .unwrap();

        while let Some(update) = updates.next().await {
            if let fedimint_mint_client::ReissueExternalNotesState::Failed(e) = update {
                return Err(anyhow::Error::msg(format!("Reissue failed: {e}")));
            }

            info!("Update: {:?}", update);
        }
        self.ng_save_incoming_ecash_tx(amount).await;
        Ok(amount)
    }

    pub async fn ng_generate_ecash(
        &self,
        amount: Amount,
    ) -> Result<TieredMulti<fedimint_mint_client::SpendableNote>> {
        let (_, notes) = self.ng.spend_notes(amount, Duration::from_secs(30)).await?;
        let amount = notes.total_amount();
        self.ng_save_outgoing_ecash_tx(amount).await;
        Ok(notes)
    }

    pub async fn ng_generate_invoice(
        &self,
        amount: fedimint_core::Amount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<(OperationId, Invoice)> {
        let dbtx = self.ng.db().begin_transaction().await;
        let active_gateway = self.ng.fetch_active_gateway().await?;
        dbtx.commit_tx().await;

        let (operation_id, invoice) = self
            .ng
            .create_bolt11_invoice_and_receive(amount, description, expiry_time, active_gateway)
            .await?;

        self.ng_subscribe_invoice(operation_id.clone(), invoice.clone())
            .await?;

        Ok((operation_id, invoice))
    }

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
                    .expect("failed to subscribe to updates");
                while let Some(update) = updates.next().await {
                    info!("Update: {:?}", update);
                    match update {
                        LnReceiveState::Claimed { txid } => {
                            // FIXME: unwrap
                            fed.ng
                                .await_claim_notes(operation_id, txid)
                                .await
                                .expect("failed to claim notes");
                            fed.ng_save_incoming_lightning_tx(&invoice).await;
                        }
                        LnReceiveState::Canceled { reason } => {
                            // TODO: send message that it failed
                            // return Err(reason.into());
                        }
                        _ => {}
                    }
                }
            })
            .await;
        Ok(())
    }

    pub async fn ng_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        let dbtx = self.ng.db().begin_transaction().await;
        let mut active_gateway = self.ng.fetch_active_gateway().await?;
        active_gateway.api = override_localhost(&active_gateway.api);
        dbtx.commit_tx().await;

        let federation_id = self.federation_id();
        let operation_id = self
            .ng
            .pay_bolt11_invoice(federation_id, invoice.to_owned(), active_gateway)
            .await?;

        let mut updates = self.ng.subscribe_ln_pay_updates(operation_id).await?;

        while let Some(update) = updates.next().await {
            match update {
                LnPayState::Success { .. } => {
                    self.ng_save_outgoing_lightning_tx(invoice).await;
                    return Ok(());
                }
                LnPayState::Refunded { refund_txid } => {
                    self.ng.await_claim_notes(operation_id, refund_txid).await?;
                }
                _ => {}
            }

            info!("Update: {:?}", update);
        }

        return Err(anyhow::anyhow!("Lightning Payment failed"));
    }

    pub async fn ng_switch_gateway(&self, pubkey: PublicKey) -> Result<()> {
        let dbtx = self.ng.db().begin_transaction().await;
        self.ng.switch_active_gateway(Some(pubkey), dbtx).await?;
        Ok(())
    }

    pub async fn ng_history(
        &self,
    ) -> Result<Vec<(ChronologicalOperationLogKey, OperationLogEntry)>> {
        let ops = self.ng.get_operations(100).await;
        Ok(ops)
    }

    // FIXME: remove this
    pub async fn ng_save_outgoing_lightning_tx(&self, invoice: &Invoice) {
        let amount = fedimint_core::Amount::from_msats(
            invoice
                .amount_milli_satoshis()
                .expect("assuming we only receive payments for invoices with amount"),
        );
        let fee = None;
        let tx = Transaction::lightning(TransactionDirection::Send, amount, fee, invoice.clone());
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
        let tx =
            Transaction::lightning(TransactionDirection::Receive, amount, fee, invoice.clone());
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
        self.username.lock().await.clone()
    }

    pub async fn set_username(&self, username: String) {
        *self.username.lock().await = Some(username);
    }

    /// Sign LNURL message using a key derived from client secret
    /// TODO: use different key per "site"
    pub fn sign_lnurl_message(&self, msg: &Message) -> LnurlSignedMessage {
        unimplemented!()
    }

    /// Returns an XMPP password derived from client secret. This enables recovery of XMPP account
    /// after recovering wallet.
    pub async fn xmpp_credentials(&self) -> XmppCredentials {
        XmppCredentials {
            password: "password".to_string(),
            keypair_seed: "keypair".to_string(),
        }
    }

    /// Check whether lightning invoice is safe to pay
    pub async fn can_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        unimplemented!()
    }

    /// Validate that string is valid ecash and signed by federation.
    /// TODO: check that it's unspent in the federation.
    pub async fn validate_ecash(&self, ecash: TieredMulti<SpendableNote>) -> (bool, Amount) {
        unimplemented!()
    }

    /// Generate on-chain receive address
    pub async fn generate_address(&self) -> Address {
        unimplemented!()
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
        // send balance update in the background
        let fed = self.clone();
        self.task_group
            .clone()
            .spawn(
                format!(
                    "post transaction ({}) federation update for {}",
                    tx.id,
                    fed.name()
                ),
                |_| async move {
                    fed.send_federation_event().await;
                },
            )
            .await;
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
        let fedimint_federation = federation_to_fedimint_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(fedimint_federation).await;
        self.event_sink.typed_event(&event);
    }

    /// Notify React Native that we've observed new or updated transaction
    fn send_transaction_event(&self, tx: &Transaction) {
        let event = Event::transaction(self.federation_id(), tx.clone());
        self.event_sink.typed_event(&event);
    }
}
