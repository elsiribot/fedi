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
    db::IDatabase,
    module::registry::ModuleDecoderRegistry,
};
use fedimint_ln_client::{LightningClientExt, LnPayState, LnReceiveState};

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
        for mut federation in federations_vec.into_iter() {
            federation.start_pollers().await;
            federations_map.insert(federation.id(), Arc::new(federation));
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
        let connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        info!("joining federation: {}", connect_cfg.id);
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
        let federation_id = federation.id();
        {
            let global_db = self.storage.global_db().await?;
            let mut dbtx = global_db.begin_transaction().await;
            dbtx.insert_entry(&JoinedFederation(federation_id), &())
                .await;
            dbtx.commit_tx().await;
            info!("saved joined")
        }
        let mut federations = self.federations.lock().await;
        if !federations.contains_key(&federation_id) {
            federation.start_pollers().await;
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
        self.stop_pollers().await?;

        let entropy = mnemonic.to_entropy();
        let entropy: [u8; 16] = entropy[0..16]
            .try_into()
            .context("mnemonic entropy array of wrong size")?;

        // update client secret in memory
        let fed = {
            let mut feds = self.federations.lock().await;
            let fed_arc = feds
                .get(federation_id)
                .ok_or(anyhow!("Federation not found"))?;
            let mut fed = (**fed_arc).clone();

            // write client secret to db
            fed.client.dangerous_save_client_secret(entropy).await;

            // HACK
            // create a new client which will load updated client secret from db
            let config = fed.client.config();
            let db = fed.client.db();
            let secp = Secp256k1::new();
            let gens = module_gens();
            let decoders = load_decoders(&config, &gens);
            let new_client = FediUserClient::new(config, gens, decoders, db.clone(), secp).await;
            fed.client = Arc::new(new_client);

            // start pollers
            fed.start_pollers().await;

            feds.insert(federation_id.clone(), Arc::new(fed.clone()));
            fed
        };

        // recover ecash tokens
        let username = fed.restore_ecash_from_federation().await?;
        tracing::info!("Ecash recovery complete, username={:?}", username);

        Ok(username)
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

        // Stop pollers
        info!("stopping pollers");
        federation.stop_pollers().await?;

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
    pub client: Arc<FediUserClient>,
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
        let decoders = load_decoders(&config.client_config, &gens);

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

        let user_client = FediUserClient::new(
            config.client_config,
            gens,
            decoders,
            ng.db().clone(),
            Default::default(),
        )
        .await;

        Ok(Self {
            client: Arc::new(user_client),
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
        let connect_cfg: WsClientConnectInfo = WsClientConnectInfo::from_str(&connect_string)?;
        tracing::info!("parsed connection string");
        let api = WsFederationApi::from_connect_info(&[connect_cfg.clone()]);
        tracing::info!("fetching config");
        let cfg: ClientConfig = api.download_client_config(&connect_cfg).await?;

        // Hack to run against local federation
        let mut cfg_string = serde_json::to_string(&cfg).context("unable to serialize cfg")?;
        if std::env::consts::OS == "android" {
            info!("android hacks");
            cfg_string = cfg_string.replace("localhost", "10.0.2.2");
            cfg_string = cfg_string.replace("127.0.0.1", "10.0.2.2");
        };
        if std::env::consts::OS == "ios" {
            // I haven't tested this
            info!("ios hacks");
            cfg_string = cfg_string.replace("127.0.0.1", "localhost");
        };
        let client_config: UserClientConfig = serde_json::from_str(&cfg_string)?;
        let fedi_config = FediConfig {
            username: None,
            client_config,
        };

        let federation_id: FederationId = fedi_config.client_config.0.federation_id.clone();

        let dyn_db = storage.federation_db(&federation_id).await?;
        let dbtx = dyn_db.begin_transaction().await;
        let notifications = Default::default();
        let mut dbtx = DatabaseTransaction::new(dbtx, Default::default(), &notifications);
        // Save config to db
        {
            dbtx.insert_entry(&FediClientConfigKey, &serde_json::to_string(&fedi_config)?)
                .await;
            dbtx.commit_tx().await;
        }
        // TODO: delete the database if failed

        Self::from_config(fedi_config, dyn_db, event_sink, task_group).await
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
        Ok(amount)
    }

    pub async fn ng_generate_ecash(
        &self,
        amount: Amount,
    ) -> Result<TieredMulti<fedimint_mint_client::SpendableNote>> {
        let (_, notes) = self.ng.spend_notes(amount, Duration::from_secs(30)).await?;
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
        Ok((operation_id, invoice))
    }

    pub async fn ng_await_invoice(&self, operation_id: OperationId) -> Result<()> {
        let mut updates = self
            .ng
            .subscribe_to_ln_receive_updates(operation_id)
            .await?;
        while let Some(update) = updates.next().await {
            match update {
                LnReceiveState::Claimed { txid } => {
                    self.ng.await_claim_notes(operation_id, txid).await?;
                    return Ok(());
                }
                LnReceiveState::Canceled { reason } => {
                    return Err(reason.into());
                }
                _ => {}
            }

            info!("Update: {:?}", update);
        }

        return Err(anyhow::anyhow!("Unknown Lightning receive state"));
    }

    pub async fn ng_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        let dbtx = self.ng.db().begin_transaction().await;
        let active_gateway = self.ng.fetch_active_gateway().await?;
        dbtx.commit_tx().await;

        let federation_id = self.id();
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
        let tx =
            Transaction::lightning(TransactionDirection::Receive, amount, fee, invoice.clone());
        self.save_transaction(&tx, true).await;
    }

    pub fn user_client(&self) -> &Client<UserClientConfig> {
        self.client.as_ref()
    }
    //
    // Helpers
    //
    pub fn name(&self) -> String {
        // FIXME: unwrap, clone
        self.user_client()
            .config()
            .0
            .meta
            .get(META_FEDERATION_NAME_KEY)
            .unwrap()
            .clone()
    }

    // FIXME: move to new client
    pub fn id(&self) -> FederationId {
        self.user_client().config().0.federation_id
    }

    pub fn network(&self) -> bitcoin::Network {
        self.user_client().wallet_client().config.network
    }

    pub fn normalized_federation_name(&self) -> String {
        self.name().replace(" ", "_")
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
        let secret = self.user_client().root_secret.child_key(LNURL_CHILD_ID);
        let secp = Secp256k1::new();
        let keypair = secret.to_secp_key(&Secp256k1::new());
        let pubkey = keypair.public_key();
        let signature = secp.sign_ecdsa(msg, &keypair.secret_key());
        LnurlSignedMessage {
            signature,
            pubkey: types::PublicKey(pubkey),
        }
    }

    /// Returns an XMPP password derived from client secret. This enables recovery of XMPP account
    /// after recovering wallet.
    pub async fn xmpp_credentials(&self) -> XmppCredentials {
        let xmpp_secret = self.user_client().root_secret.child_key(XMPP_CHILD_ID);
        let password_bytes: [u8; 16] = xmpp_secret.child_key(XMPP_PASSWORD).to_random_bytes();
        let keypair_seed_bytes: [u8; 32] =
            xmpp_secret.child_key(XMPP_KEYPAIR_SEED).to_random_bytes();

        XmppCredentials {
            password: hex::encode(&password_bytes),
            keypair_seed: hex::encode(&keypair_seed_bytes),
        }
    }

    //
    // Lightning
    //

    /// Generate lightning invoice and save it to the database
    pub async fn generate_invoice(
        &self,
        amount: fedimint_core::Amount,
        description: String,
    ) -> Result<Invoice> {
        let mut rng = rand::rngs::OsRng;

        let confirmed_invoice = self
            .client
            .generate_confirmed_invoice(amount, description, &mut rng, None)
            .await?;

        // Save the keys and invoice for later polling`
        self.save_payment(&Payment::new(
            confirmed_invoice.invoice.clone(),
            PaymentStatus::Pending,
            PaymentDirection::Incoming,
        ))
        .await;

        Ok(confirmed_invoice.invoice)
    }

    /// Check whether lightning invoice is safe to pay
    pub async fn can_pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        // We haven't already paid it
        if self
            .list_payments()
            .await
            .iter()
            .filter(|payment| payment.outgoing() && &payment.invoice == invoice)
            .next()
            .is_some()
        {
            return Err(anyhow!("Can't pay invoice twice"));
        }

        // Has an amount
        if invoice.amount_milli_satoshis().is_none() {
            return Err(anyhow!("Invoice is missing amount"));
        }

        // Same network
        if network_to_currency(self.network()) != invoice.currency() {
            return Err(anyhow!(format!(
                "Invoice is for wrong network. Expected {}, got {}",
                network_to_currency(self.network()),
                invoice.currency()
            )));
        }

        Ok(())
    }

    /// Private method to pay a lightning invoice via federation
    async fn pay_invoice_inner(&self, invoice: &Invoice) -> Result<()> {
        let mut rng = rand::rngs::OsRng;

        let (contract_id, outpoint) = self
            .client
            .fund_outgoing_ln_contract(invoice.clone(), &mut rng)
            .await?;

        self.user_client()
            .await_outgoing_contract_acceptance(outpoint)
            .await?;

        let result = self
            .client
            .await_outgoing_contract_execution(contract_id, &mut rng)
            .await;

        // FIXME: actually check that a refund happened
        if result.is_err() {
            // FIXME: this is deceiving ... we're fetching a refund here
            self.send_federation_event().await;
        }

        Ok(result?)
    }

    /// Check whether lightning invoice can be paid, pay it, save results in DB
    pub async fn pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        // validate that we can pay this invoice
        self.can_pay_invoice(&invoice).await?;

        match self.pay_invoice_inner(&invoice).await {
            Ok(_) => {
                let fee = Some(hacky_lightning_invoice_fee(invoice)?);
                self.save_payment(&Payment::new(
                    invoice.clone(),
                    PaymentStatus::Paid,
                    PaymentDirection::Outgoing,
                ))
                .await;
                self.save_transaction(
                    &Transaction::lightning(
                        TransactionDirection::Send,
                        fedimint_core::Amount::from_msats(
                            invoice
                                .amount_milli_satoshis()
                                .context("assuming invoice has amount")?,
                        ),
                        fee,
                        invoice.clone(),
                    ),
                    false,
                )
                .await;
                Ok(())
            }
            Err(e) => {
                self.save_payment(&Payment::new(
                    invoice.clone(),
                    PaymentStatus::Failed,
                    PaymentDirection::Outgoing,
                ))
                .await;
                Err(e)
            }
        }
    }

    //
    // Ecash
    //

    /// Generate ecash. It's immediately removed from client DB. Transaction saved to DB.
    pub async fn generate_ecash(&self, amount: Amount) -> Result<TieredMulti<SpendableNote>> {
        let rng = rand::rngs::OsRng;
        let ecash: TieredMulti<SpendableNote> = self.user_client().spend_ecash(amount, rng).await?;
        self.save_transaction(
            &Transaction::offline(tx::TransactionDirection::Send, amount),
            false,
        )
        .await;
        Ok(ecash)
    }

    /// Validate that string is valid ecash and signed by federation.
    /// TODO: check that it's unspent in the federation.
    pub async fn validate_ecash(&self, ecash: TieredMulti<SpendableNote>) -> (bool, Amount) {
        let valid = self
            .user_client()
            .validate_note_signatures(&ecash)
            .await
            .is_ok();
        let amount = ecash.total_amount();
        (valid, amount)
    }

    /// Receive ecash into wallet. Save transaction to DB.
    pub async fn receive_ecash(&self, ecash: TieredMulti<SpendableNote>) -> Result<Amount> {
        let rng = rand::rngs::OsRng;
        let outpoint = self.user_client().reissue(ecash.clone(), rng).await?;
        // FIXME: run this in the background?
        if let Err(e) = self.user_client().await_outpoint_outcome(outpoint).await {
            error!("Failed to claim contract {}", e);
        }
        self.save_transaction(
            &Transaction::offline(tx::TransactionDirection::Receive, ecash.total_amount()),
            true,
        )
        .await;
        Ok(ecash.total_amount())
    }

    //
    // On-chain
    //

    /// Generate on-chain receive address
    pub async fn generate_address(&self) -> Address {
        let rng = rand::rngs::OsRng;
        self.user_client().get_new_pegin_address(rng).await
    }

    /// Hack to lookup url where we can fetch txoutproofs
    fn txout_proof_url(&self, txid: &Txid) -> Result<String> {
        match self.network() {
            Network::Regtest => Ok(format!("https://testfed.xyz/proof/{}", txid)),
            Network::Bitcoin => Ok(format!(
                "https://blockstream.info/api/tx/{}/merkleblock-proof",
                txid
            )),
            network => Err(anyhow!(
                "on-chain deposts not supported on this {}",
                network
            )),
        }
    }

    /// Hack to lookup letrum server URL used for handling peg-ins
    fn electrum_url(&self) -> Result<String> {
        match self.network() {
            Network::Regtest => Ok("188.166.55.8:60401".into()),
            Network::Bitcoin => Ok("tcp://electrum.blockstream.info:50001".into()),
            network => Err(anyhow!(
                "on-chain deposts not supported on this {}",
                network
            )),
        }
    }

    /// Check that we can safely pay on-chain bitcoin address
    pub fn can_pay_address(&self, address: &Address) -> Result<()> {
        if self.network() != address.network {
            return Err(anyhow!(format!(
                "Address is for wrong network. Expected {}, got {}",
                self.network(),
                address.network
            )));
        }
        Ok(())
    }

    /// Fetch consensus block height from gederatino
    async fn fetch_consensus_block_height(&self) -> anyhow::Result<u64> {
        Ok(self
            .client
            .wallet_client()
            .context
            .api
            .fetch_consensus_block_height()
            .await?)
    }

    /// List all the scripts of addresses we've generated. Used to execute peg-ins.
    pub async fn list_scripts(&self) -> Vec<Script> {
        self.dbtx()
            .await
            .find_by_prefix(&PegInPrefixKey)
            .await
            .map(|(key, _)| key.peg_in_script)
            .collect()
            .await
    }

    #[cfg(target_family = "wasm")]
    pub async fn pegin_script(&self, script: &Script) -> Result<()> {
        todo!()
    }

    /// Execute peg-in for given script
    #[cfg(not(target_family = "wasm"))]
    pub async fn pegin_script(&self, script: &Script) -> Result<()> {
        use electrum_client::{Client, ElectrumApi};
        use fedimint_core::txoproof::TxOutProof;
        let electrum = Client::new(&self.electrum_url()?)?;
        let history = electrum.script_get_history(&script)?;
        for item in history {
            let url = self.txout_proof_url(&item.tx_hash)?;
            if let Ok(raw_txout_proof) = reqwest::get(url).await?.text().await {
                // Skip if we've already claimed it
                match self.get_transaction(item.tx_hash.to_string()).await {
                    None => (),
                    Some(tx) => match tx.bitcoin {
                        None => (),
                        Some(details) => {
                            if let Some(IncomingBitcoinTransactionStatus::Complete) =
                                details.incoming_status
                            {
                                tracing::debug!("already pegged-in {}", &item.tx_hash);
                                continue;
                            }
                        }
                    },
                };

                let btc_transaction = electrum.transaction_get(&item.tx_hash)?;
                let txout_proof: TxOutProof = from_hex(&raw_txout_proof)?;
                let rng = rand::rngs::OsRng;
                let address =
                    Address::from_script(script, self.user_client().wallet_client().config.network)
                        .context("address::from_script")?;
                let fee = None;
                // FIXME: there should be a simpler API to get the amount of a peg-in
                let amount_sats = self
                    .client
                    .wallet_client()
                    .create_pegin_input(txout_proof.clone(), btc_transaction.clone())
                    .await?
                    .1
                    .tx_output()
                    .value;
                let amount = fedimint_core::Amount::from_sats(amount_sats);
                if let Err(_) = self
                    .client
                    .peg_in(txout_proof.clone(), btc_transaction.clone(), rng)
                    .await
                {
                    // Save pending tx if we haven't already, move on to next one
                    if self
                        .get_transaction(item.tx_hash.to_string())
                        .await
                        .is_none()
                    {
                        self.save_transaction(
                            &Transaction::bitcoin(
                                TransactionDirection::Receive,
                                amount,
                                fee,
                                address,
                                item.tx_hash,
                                Some(IncomingBitcoinTransactionStatus::Pending),
                            ),
                            true,
                        )
                        .await;
                    }
                    continue;
                }

                tracing::info!("peg-in successful for {}", address);
                // FIXME: helper to replace existing transaction
                let mut tx = self
                    .get_transaction(item.tx_hash.to_string())
                    .await
                    .unwrap_or(Transaction::bitcoin(
                        TransactionDirection::Receive,
                        amount,
                        fee,
                        address.clone(),
                        item.tx_hash,
                        Some(IncomingBitcoinTransactionStatus::Pending),
                    ));
                // FIXME: make a helper for this
                let mut details = tx.bitcoin.context("this should exist (fixme)")?;
                details.incoming_status = Some(IncomingBitcoinTransactionStatus::Complete);
                tx.bitcoin = Some(details);
                self.save_transaction(&tx, true).await;
            }
        }

        Ok(())
    }

    /// Attempt to peg-in every script in our DB
    pub async fn attempt_pegins(&self) {
        tracing::info!("attempting pegins");
        let fed = self.clone();
        let scripts = fed.list_scripts().await;
        for script in scripts.iter() {
            let f = fed.clone();
            let s = script.clone();
            self.task_group
                .clone()
                .spawn("pegin script", |_| {
                    async move {
                        if let Err(e) = f.pegin_script(&s).await {
                            tracing::debug!(
                                "Failed to pegin address: {}",
                                Address::from_script(&s, f.client.wallet_client().config.network)
                                    .unwrap()
                            );
                            tracing::debug!("{:?}", e);
                        }
                        tracing::info!("Finished pegins for {:?}", s);
                    }
                    // parent span to display the span too in logs
                    .instrument(info_span!(parent: Span::current(), "attempt pegin"))
                })
                .await;
        }
    }

    //
    // Database
    //

    /// Create database transaction
    async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.user_client().db().begin_transaction().await
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

    /// Save payment to DB
    pub async fn save_payment(&self, payment: &Payment) {
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&PaymentKey(payment.invoice.payment_hash().clone()), payment)
            .await;
        dbtx.commit_tx().await;
    }

    /// Get all payments from DB
    pub async fn list_payments(&self) -> Vec<Payment> {
        self.dbtx()
            .await
            .find_by_prefix(&PaymentKeyPrefix)
            .await
            .map(|res| res.1)
            .collect()
            .await
    }

    /// Fetch single payment from DB by payment hash
    pub async fn fetch_payment(&self, payment_hash: &sha256::Hash) -> Option<Payment> {
        self.dbtx()
            .await
            .get_value(&PaymentKey(payment_hash.clone()))
            .await
    }

    /// Update payment status of a payment in the DB
    pub async fn update_payment_status(&self, payment_hash: &sha256::Hash, status: PaymentStatus) {
        if let Some(mut payment) = self.fetch_payment(&payment_hash).await {
            payment.status = status;
            let mut dbtx = self.dbtx().await;
            dbtx.insert_entry(&PaymentKey(*payment_hash), &payment)
                .await;
            dbtx.commit_tx().await;
        }
        // TODO: what to do if this payment doesn't exist?
    }

    /// Check the DB to see if we've already attempted to pay an invoice
    pub async fn already_paid_invoice(&self, invoice: &Invoice) -> bool {
        self.list_payments()
            .await
            .iter()
            .filter(|payment| payment.outgoing() && &payment.invoice == invoice)
            .next()
            .is_some()
    }

    //
    // Events
    //

    /// Send whenever the balance or social recovery state changes
    pub async fn send_federation_event(&self) {
        // FIXME: should handle this result
        self.user_client()
            .fetch_all_notes()
            .await
            .unwrap_or_else(|e| {
                error!("Failed to fetch notes: {:?}", e);
                vec![]
            });
        let fedimint_federation = federation_to_fedimint_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(fedimint_federation).await;
        self.event_sink.typed_event(&event);
    }

    /// Notify React Native that we've observed new or updated transaction
    fn send_transaction_event(&self, tx: &Transaction) {
        let event = Event::transaction(self.id(), tx.clone());
        self.event_sink.typed_event(&event);
    }

    //
    // Ecash Recovery
    //

    /// Get 12 seed words associated with client secret
    pub async fn get_mnemonic(&self) -> Mnemonic {
        let client_secret = self.user_client().get_client_secret().await;
        // FIXME: use all the entropy
        Mnemonic::from_entropy(&client_secret.entropy())
    }

    /// Restore ecash from federation from current client secret
    pub async fn restore_ecash_from_federation(&self) -> Result<Option<String>> {
        // let mut task_group = TaskGroup::new();
        // let username = self
        //     .client
        //     .mint_client()
        //     .restore_ecash_from_federation(GAP_LIMIT, &mut task_group)
        //     .await??;

        // Update username
        // {
        //     let mut lock = self.username.lock().await;
        //     *lock = username.clone();
        // }

        // FIXME: should we still do this?
        self.send_federation_event().await;
        // Ok(username)
        Ok(None)
    }

    /// Upload ecash backup to the federation
    pub async fn back_up_ecash_to_federation(&self) -> Result<()> {
        // let username = self.get_username().await;
        let metadata = Metadata::empty();
        self.user_client()
            .mint_client()
            // .back_up_ecash_to_federation(username)
            .back_up_ecash_to_federation(metadata)
            .await?;
        Ok(())
    }

    //
    // Social Recovery
    //

    /// Upload social recovery recovery file to federation given a recovery video
    pub async fn upload_backup_file(&self, video_file: Vec<u8>) -> Result<Vec<u8>> {
        let verification_doc = VerificationDocument::from_raw(&video_file);
        // FIXME: two different forms of seed phrase
        let seed_phrase = UserSeedPhrase::from(self.get_mnemonic().await.to_string());

        let backup_client = self.client.social_backup();
        let recovery_file =
            backup_client.prepare_recovery_file(verification_doc.clone(), seed_phrase.clone());
        backup_client
            .upload_backup_to_federation(&recovery_file)
            .await?;
        Ok(recovery_file.to_bytes())
    }

    /// Attempt to continue a previous social recovery session by loading state from DB
    pub async fn social_recovery_continue(&self) -> Result<SocialRecovery> {
        let mut dbtx = self.dbtx().await;
        let state = dbtx
            .get_value(&SocialRecoveryStateKey(self.id()))
            .await
            .ok_or(anyhow!("no active recovery session"))?;
        Ok(self.client.social_recovery_continue(state))
    }

    /// Save social recovery session state to the DB
    pub async fn social_recovery_save(
        &self,
        recovery_client: &SocialRecovery,
        dbtx: &mut DatabaseTransaction<'_>,
    ) {
        // FIXME: should I pass dbtx from outside?
        dbtx.insert_entry(&SocialRecoveryStateKey(self.id()), recovery_client.state())
            .await;
    }

    /// Save social recovery ID to the DB. This is used to generate the recovery QR.
    pub async fn save_social_recovery_id(
        &self,
        recovery_id: &RecoveryId,
        dbtx: &mut DatabaseTransaction<'_>,
    ) {
        dbtx.insert_entry(&SocialRecoveryIdKey(self.id()), &recovery_id)
            .await;
    }

    /// Get social recovery Id from the DB. This is used to generate the recovery QR.
    pub async fn get_social_recovery_id(&self) -> Option<types::RecoveryId> {
        self.dbtx()
            .await
            .get_value(&SocialRecoveryIdKey(self.id()))
            .await
            .map(types::RecoveryId)
    }

    /// Start a new social recovery session if one doesn't exist already
    /// FIXME: This will lead to bugs because if someone gets stuck inside a session there will be no way to exist
    /// Also won't be able to do simulataneous recoveries in 2 federations.
    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        let mut dbtx = self.dbtx().await;
        let recovery_client = match self.social_recovery_continue().await {
            Ok(recovery_client) => recovery_client,
            Err(_) => {
                let recovery_client = self.client.social_recovery_start(recovery_file.clone())?;
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

    /// Delete all social recovery state from DB
    pub async fn delete_social_recovery_state_and_id(&self) {
        let mut dbtx = self.dbtx().await;
        dbtx.remove_entry(&SocialRecoveryStateKey(self.id())).await;
        dbtx.remove_entry(&SocialRecoveryIdKey(self.id())).await;
        // TODO: delete the verification file?
        dbtx.commit_tx().await;
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

    /// Get a list of the state of all social recoveries from all guardians
    pub async fn social_recovery_approvals(&self) -> Result<(Vec<SocialRecoveryApproval>, usize)> {
        let mut recovery_client = self.social_recovery_continue().await?;
        let guardian_peer_ids: Vec<(String, PeerId)> = self
            .client
            .config()
            .0
            .api_endpoints
            .into_iter()
            .map(|(peer_id, endpoint)| (endpoint.name.clone(), peer_id)) // FIXME: don't use "as"
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
    pub async fn social_recovery_combine_shares(&self) -> Result<Mnemonic> {
        let recovery_client = self.social_recovery_continue().await?;
        let seed_phrase = recovery_client.combine_recovered_user_phrase()?;
        let mnemonic = Mnemonic::parse(seed_phrase.0)?;
        Ok(mnemonic)
    }

    /// Download social recovery video to `data_dir`
    pub async fn social_recovery_download_verification_doc(
        &self,
        recovery_id: &RecoveryId,
    ) -> Result<Option<Vec<u8>>> {
        // FIXME: what to do for peer id?
        tracing::info!("downloading verificaiton doc {}", recovery_id);
        // FIXME: maybe shouldn't download from only one peer?
        let verification_client = self.client.social_verification(PeerId::from(0));
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

    /// Approve social recovery request. Currently hard-codes guardian authentication credentials.
    pub async fn approve_social_recovery_request(
        &self,
        recovery_id: &RecoveryId,
        peer_id: PeerId,
        password: &str,
    ) -> Result<()> {
        tracing::info!("approve social recovery {} {}", peer_id, password);
        let verification_client = self.client.social_verification(peer_id);
        verification_client
            .approve_recovery(*recovery_id, password)
            .await?;
        Ok(())
    }

    /// Stop polling tasks
    pub async fn stop_pollers(&self) -> anyhow::Result<()> {
        self.task_group
            .clone()
            .shutdown_join_all(Some(Duration::from_secs(3)))
            .await
    }

    /// Start polling tasks
    pub async fn start_pollers(&mut self) {
        // let fed = self.clone();
        // self.task_group
        //     .spawn(
        //         format!("{} peg-in poller", self.name()),
        //         |task_handle| async move {
        //             fed.poll_peg_ins(task_handle).await;
        //         },
        //     )
        //     .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} incoming ln poller", self.name()),
                |task_handle| async move {
                    fed.poll_incoming_ln(task_handle).await;
                },
            )
            .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ln refund poller", self.name()),
                |task_handle| async move {
                    fed.poll_ln_refunds(task_handle).await;
                },
            )
            .await;
    }

    /// Checks for peg-ins every second
    #[instrument(level = "info", skip_all, fields(fed = ?self.name()))]
    pub async fn poll_peg_ins(&self, task_handle: TaskHandle) {
        let mut last_consensus_block_height = None;
        loop {
            if task_handle.is_shutting_down() {
                return;
            }
            let current_block_height = self.fetch_consensus_block_height().await.ok();
            if last_consensus_block_height != current_block_height {
                self.attempt_pegins().await;
                last_consensus_block_height = current_block_height;
            }
            fedimint_core::task::sleep(Duration::from_secs(1)).await;
        }
    }

    /// Checks for incoming payments every second
    #[instrument(level = "info", skip_all, fields(fed = ?self.name()))]
    pub async fn poll_incoming_ln(&self, task_handle: TaskHandle) {
        let fed = self.clone();
        loop {
            if task_handle.is_shutting_down() {
                return;
            }

            let pending_payments: Vec<Payment> = fed
                .list_payments()
                .await
                .into_iter()
                // TODO: should we filter
                .filter(|payment| !payment.paid() && !payment.expired() && payment.incoming())
                .collect();

            // Try to complete incoming payments
            pending_payments
                .iter()
                .map(|payment| async {
                    // FIXME: don't create rng in here ...
                    let invoice_expired = payment.invoice.would_expire(
                        fedimint_core::time::now()
                            .duration_since(SystemTime::UNIX_EPOCH)
                            .expect("now should be creater than unix epoch"),
                    );
                    let rng = rand::rngs::OsRng;
                    let payment_hash = payment.invoice.payment_hash();
                    tracing::debug!("fetching incoming contract {:?}", &payment_hash);
                    match &fed
                        .client
                        .claim_incoming_contract(
                            ContractId::from_hash(payment_hash.clone()),
                            rng.clone(),
                        )
                        .await
                    {
                        Err(_) => {
                            tracing::debug!("couldn't complete payment: {:?}", &payment_hash);
                            // Mark it "expired" in db if we couldn't claim it and invoice is expired
                            if invoice_expired {
                                fed.update_payment_status(payment_hash, PaymentStatus::Expired)
                                    .await;
                            }
                        }
                        Ok(outpoint) => {
                            // FIXME: could this lead to funds loss if it errors out? can contracts be claimed a second time? or will next "fetch" find these coins?
                            if let Err(e) =
                                self.user_client().await_outpoint_outcome(*outpoint).await
                            {
                                error!("Failed to claim contract {}", e);
                                return;
                            }
                            tracing::info!("completed payment: {:?}", &payment_hash);
                            fed.update_payment_status(payment_hash, PaymentStatus::Paid)
                                .await;
                            let amount = fedimint_core::Amount::from_msats(
                                payment.invoice.amount_milli_satoshis().expect(
                                    "assuming we only receive payments for invoices with amount",
                                ),
                            );
                            let fee = None;
                            let tx = Transaction::lightning(
                                TransactionDirection::Receive,
                                amount,
                                fee,
                                payment.invoice.clone(),
                            );
                            fed.save_transaction(&tx, true).await;
                        }
                    }
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;

            fedimint_core::task::sleep(Duration::from_secs(1)).await;
        }
    }

    /// Attempts lightning refunds every minute
    #[instrument(level = "info", skip_all, fields(fed = ?self.name()))]
    pub async fn poll_ln_refunds(&self, task_handle: TaskHandle) {
        let fed = self.clone();
        let mut last_poll = SystemTime::UNIX_EPOCH;

        loop {
            if task_handle.is_shutting_down() {
                return;
            }

            // Run once per minute
            if fedimint_core::time::now()
                .duration_since(last_poll.clone())
                .expect("clock went backwards")
                .as_secs()
                < 60
            {
                fedimint_core::task::sleep(Duration::from_secs(1)).await;
                continue;
            }
            last_poll = fedimint_core::time::now();

            let consensus_block_height = fed.fetch_consensus_block_height().await.unwrap_or(0);
            let contracts = fed
                .client
                .ln_client()
                .refundable_outgoing_contracts(consensus_block_height)
                .await;
            tracing::info!("looking for refunds...");
            contracts
                .iter()
                .map(|contract| async {
                    tracing::info!(
                        "attempting to get refund {:?}",
                        contract.contract_account.contract.contract_id(),
                    );
                    match fed
                        .client
                        .try_refund_outgoing_contract(
                            contract.contract_account.contract.contract_id(),
                            rand::rngs::OsRng,
                        )
                        .await
                    {
                        Ok(_) => {
                            tracing::info!("got refund");
                            fed.send_federation_event().await;
                        }
                        Err(e) => tracing::info!("refund failed {:?}", e),
                    };
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;
        }
    }
}
