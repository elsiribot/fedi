// pub mod bridge;
// pub mod event;
// pub mod payment;
// pub mod tx;
// pub mod types;

use std::{
    collections::HashMap,
    fs::File,
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, SystemTime},
    default::Default,
};

use crate::{
    event::Event,
    payment::{Payment, PaymentDirection, PaymentKey, PaymentKeyPrefix, PaymentStatus},
    tx::{Transaction, TransactionKey, TransactionKeyPrefix},
    types::hacky_millisat_to_sat,
    EventSinkWrapper,
};
use anyhow::{anyhow, Result};
use bitcoin::{hashes::sha256, Address, Script, Txid};
use electrum_client::{Client, ElectrumApi};
use fedimint_api::config::ClientConfig;
use fedimint_api::db::DatabaseTransaction;
use fedimint_api::encoding::ModuleRegistry;
use fedimint_api::NumPeers;
use fedimint_core::modules::ln::contracts::{ContractId, IdentifyableContract};
use fedimint_core::{
    config::{load_from_file},
    modules::wallet::txoproof::TxOutProof,
};
use fedimint_sled::SledDb;
use futures::{stream::FuturesUnordered, StreamExt};
use lightning_invoice::Invoice;
use mint_client::{
    api::{WsFederationApi, WsFederationConnect},
    query::CurrentConsensus,
    UserClient, UserClientConfig,
};
use mint_client::{utils::from_hex, wallet::db::PegInPrefixKey};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

type FederationId = String;

async fn get_federations(
    data_dir: &PathBuf,
    event_sink: Arc<EventSinkWrapper>,
) -> HashMap<FederationId, Arc<Federation>> {
    let mut federations = HashMap::new();
    for element in data_dir.read_dir().unwrap() {
        let mut path = element.unwrap().path();
        if let Some(extension) = path.extension() {
            if extension == "json" {
                // TODO: perhaps this should be a federation method?
                let cfg: UserClientConfig = load_from_file(&path).expect("invalid cfg on disk"); // FIXME: this panics
                path.set_extension("db");
                let db = SledDb::open(path, "client").unwrap(); // FIXME: don't unwrap
                let client = UserClient::new(cfg.clone(), db.into(), Default::default()).await;
                let federation = Arc::new(Federation::new(client, event_sink.clone()));
                federations.insert(cfg.0.federation_name, federation);
            }
        }
    }
    federations
}

pub struct Bridge {
    /// Where dbs & configs are stored. Result of calling getApplicationDocumentsDirectory() in Dart.
    pub data_dir: PathBuf,
    pub clients: Arc<Mutex<HashMap<FederationId, Arc<Federation>>>>,
    pub event_sink: Arc<EventSinkWrapper>,
    pub pollers: Arc<Mutex<Vec<JoinHandle<()>>>>,
}

impl Bridge {
    // TODO: initialize all clients in data_dir
    pub async fn new(data_dir: PathBuf, event_sink: Arc<EventSinkWrapper>) -> Self {
        let federations = get_federations(&data_dir, event_sink.clone()).await;

        // spawn pollers
        let mut pollers = vec![];
        for fed in federations.clone().into_values() {
            let poller = tokio::spawn(async move { fed.event_loop().await });
            pollers.push(poller);
        }

        let bridge = Self {
            data_dir,
            clients: Arc::new(Mutex::new(federations)),
            pollers: Arc::new(Mutex::new(pollers)),
            event_sink,
        };
        // TODO: this should start pollers for all federations ...
        // or instantiating `Federation` should do so ...
        bridge
    }
    /// Adds federation to "clients" and starts polling (if we haven't already joined)
    pub async fn join_federation(&self, federation: Arc<Federation>) {
        let federation_name = federation.client.config().0.federation_name;
        let mut clients = self.clients.lock().await;
        if !clients.contains_key(&federation_name) {
            clients.insert(federation_name, federation.clone());
            let poller = tokio::spawn(async move {
                federation.event_loop().await;
            });
            self.pollers.lock().await.push(poller);
        }
    }
}

/// Should this have the poller reference?
#[derive(Clone)]
pub struct Federation {
    pub client: Arc<UserClient>,
    pub event_sink: Arc<EventSinkWrapper>,
}

impl Federation {
    pub fn new(client: UserClient, event_sink: Arc<EventSinkWrapper>) -> Self {
        Self {
            client: Arc::new(client),
            event_sink,
        }
    }

    fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.client.db().begin_transaction(ModuleRegistry::default())
    }

    pub async fn join(
        connect_string: String,
        data_dir: PathBuf,
        event_sink: Arc<EventSinkWrapper>,
    ) -> Result<Self> {
        // Download federation config
        let connect_cfg: WsFederationConnect = serde_json::from_str(&connect_string)?;
        tracing::info!("parsed connection string");
        let api = WsFederationApi::new(connect_cfg.members);
        tracing::info!("fetching config");
        let cfg: ClientConfig = api
            // FIXME: is this the correct policy?
            .request(
                "/config",
                (),
                CurrentConsensus::new(api.peers().one_honest()),
            )
            .await?;
        tracing::info!("config {:?}", &cfg);

        // tracing::info!("config {}", &cfg_string);
        // Hack to run against local federation
        let mut cfg_string = serde_json::to_string(&cfg).unwrap();
        cfg_string = cfg_string.replace("localhost", "10.0.2.2");
        cfg_string = cfg_string.replace("127.0.0.1", "10.0.2.2");
        let cfg: ClientConfig = serde_json::from_str(&cfg_string)?;

        // Save config
        let cfg_path = Path::new(&data_dir).join(format!("{}.json", cfg.federation_name));
        tracing::info!("saving file to {}", cfg_path.display());
        let cfg_path = Path::new(&data_dir).join(format!("{}.json", cfg.federation_name));
        let file = File::create(cfg_path) // FIXME: this should probably use tokio's `File`
            .expect("Could not create cfg file");
        serde_json::to_writer_pretty(file, &cfg).expect("Could not write gateway cfg");

        // Create user client
        let db_path = Path::new(&data_dir).join(format!("{}.db", cfg.federation_name));
        let db = SledDb::open(db_path, "client")?;
        let client = UserClient::new(UserClientConfig(cfg.clone()), db.into(), Default::default()).await;
        Ok(Self::new(client, event_sink))
    }

    pub async fn generate_address(&self) -> Address {
        let rng = rand::rngs::OsRng;
        self.client.get_new_pegin_address(rng).await
    }

    pub async fn generate_invoice(
        &self,
        amount: fedimint_api::Amount,
        description: String,
    ) -> Result<Invoice> {
        let mut rng = rand::rngs::OsRng;

        let confirmed_invoice = self
            .client
            .generate_invoice(amount, description, &mut rng, None)
            .await?;

        // Save the keys and invoice for later polling`
        self.save_payment(&Payment::new(
            confirmed_invoice.invoice.clone(),
            PaymentStatus::Pending,
            PaymentDirection::Incoming,
        )).await;
        tracing::info!("saved invoice to db");

        Ok(confirmed_invoice.invoice)
    }

    async fn pay_invoice_inner(&self, invoice: &Invoice) -> Result<()> {
        let mut rng = rand::rngs::OsRng;

        let (contract_id, outpoint) = self
            .client
            .fund_outgoing_ln_contract(invoice.clone(), &mut rng)
            .await?;

        self.client
            .await_outgoing_contract_acceptance(outpoint)
            .await?;

        let result = self
            .client
            .await_outgoing_contract_execution(contract_id, &mut rng)
            .await;

        // FIXME: actually check that a refund happened
        if result.is_err() {
            self.update_balance().await;
        }

        Ok(result?)
    }

    // TODO: make sure we aren't trying to pay invoices twice ...
    pub fn can_pay(&self, invoice: &Invoice) -> bool {
        self.list_payments()
            .iter()
            .filter(|payment| payment.outgoing() && &payment.invoice == invoice)
            .next()
            .is_none()
    }

    pub fn list_scripts(&self) -> Vec<Script> {
        self.dbtx()
            .find_by_prefix(&PegInPrefixKey)
            .map(|res| {
                let (key, _) = res.expect("DB error");
                key.peg_in_script
            })
            .collect()
    }

    pub async fn pegin_script(&self, script: &Script) -> Result<()> {
        let electrum = Client::new("188.166.55.8:60401")?;
        let history = electrum.script_get_history(&script)?;
        println!("history: {:?}", history);

        for item in history {
            if let Ok(raw_txout_proof) =
                reqwest::get(format!("https://testfed.xyz/proof/{}", item.tx_hash))
                    .await?
                    .text()
                    .await
            {
                // TODO: ignore pegins that we're already claimed or which don't have enough confirmations
                let btc_transaction = electrum.transaction_get(&item.tx_hash)?;
                let txout_proof: TxOutProof = from_hex(&raw_txout_proof)?;
                let rng = rand::rngs::OsRng;
                self.client
                    .peg_in(txout_proof.clone(), btc_transaction.clone(), rng)
                    .await?;
                // TODO: save the transaction to db. if pegin succeeded, say "complete", otherwise say "pendin"

                let address =
                    Address::from_script(script, self.client.wallet_client().config.network).unwrap();
                tracing::info!("peg-in successful for {}", address);
                self.update_balance().await;
                self.send_received_on_chain_payment_event(&item.tx_hash, &address);
                // FIXME: there should be a simpler API to get the amount of a peg-in
                let amount_millisat = self
                    .client
                    .wallet_client()
                    .create_pegin_input(txout_proof, btc_transaction)?
                    .1
                    .tx_output()
                    .value
                    * 1000;
                self.save_transaction(&Transaction::new(false, amount_millisat)).await;
            }
        }

        Ok(())
    }

    pub fn attempt_pegins(&self) {
        tracing::info!("attempting pegins");
        let fed = self.clone();
        let scripts = fed.list_scripts();
        for script in scripts.iter() {
            let f = fed.clone();
            let s = script.clone();
            tokio::spawn(async move {
                if let Err(e) = f.pegin_script(&s).await {
                    tracing::debug!(
                        "Failed to pegin address: {}",
                        Address::from_script(&s, f.client.wallet_client().config.network).unwrap()
                    );
                    tracing::debug!("{:?}", e);
                }
                tracing::info!("Finished pegins for {:?}", s);
            });
        }
    }

    pub async fn pay_invoice(&self, invoice: &Invoice) -> Result<()> {
        if !self.can_pay(&invoice) {
            return Err(anyhow!("Can't pay invoice twice"));
        }

        match self.pay_invoice_inner(&invoice).await {
            Ok(_) => {
                self.save_payment(&Payment::new(
                    invoice.clone(),
                    PaymentStatus::Paid,
                    PaymentDirection::Outgoing,
                )).await;
                self.update_balance().await;
                self.save_transaction(&Transaction::new(
                    true,
                    invoice
                        .amount_milli_satoshis()
                        .expect("assuming invoice has amount"),
                )).await;
                Ok(())
            }
            Err(e) => {
                self.save_payment(&Payment::new(
                    invoice.clone(),
                    PaymentStatus::Failed,
                    PaymentDirection::Outgoing,
                )).await;
                Err(e)
            }
        }
    }

    pub async fn save_transaction(&self, tx: &Transaction) {
        // TODO: need to expose the database
        let mut dbtx = self.dbtx();
        dbtx.insert_entry(&TransactionKey(tx.id), tx)
            .await
            .expect("Db error");
        dbtx.commit_tx().await.expect("Db error");
    }

    pub fn list_transactions(&self) -> Vec<Transaction> {
        self.client
            .db()
            .begin_transaction(ModuleRegistry::default())
            .find_by_prefix(&TransactionKeyPrefix)
            .map(|res| res.expect("Db error").1)
            .collect()
    }

    pub async fn save_payment(&self, payment: &Payment) {
        // TODO: need to expose the database
        tracing::info!("saving payment");
        let mut dbtx = self.dbtx();
        dbtx.insert_entry(&PaymentKey(payment.invoice.payment_hash().clone()), payment)
            .await
            .expect("Db error");
        dbtx.commit_tx().await.expect("Db error");
        tracing::info!("saved payment");
    }

    pub fn list_payments(&self) -> Vec<Payment> {
        self.dbtx()
            .find_by_prefix(&PaymentKeyPrefix)
            .map(|res| res.expect("Db error").1)
            .collect()
    }

    pub fn fetch_payment(&self, payment_hash: &sha256::Hash) -> Option<Payment> {
        self.dbtx()
            .get_value(&PaymentKey(payment_hash.clone()))
            .expect("Db error")
    }

    pub async fn update_payment_status(&self, payment_hash: &sha256::Hash, status: PaymentStatus) {
        if let Some(mut payment) = self.fetch_payment(&payment_hash) {
            payment.status = status;
            let mut dbtx = self.dbtx();
            dbtx.insert_entry(&PaymentKey(*payment_hash), &payment)
                .await
                .expect("Db error");
            dbtx.commit_tx().await.expect("Db error");
        }
        // TODO: what to do if this payment doesn't exist?
    }

    async fn block_height(&self) -> anyhow::Result<u64> {
        Ok(self
            .client
            .wallet_client()
            .context
            .api
            .fetch_consensus_block_height()
            .await?)
    }

    pub async fn update_balance(&self) {
        self.client.fetch_all_coins().await;
        self.send_balance_notification();
    }

    fn send_balance_notification(&self) {
        let balance = hacky_millisat_to_sat(self.client.coins().total_amount().milli_sat);
        let federation_id = self.client.config().0.federation_name;
        let event = Event::balance(federation_id.clone(), balance);
        self.event_sink.event(&event);
    }

    fn send_received_lightning_payment_event(&self, invoice: &Invoice) {
        let federation_id = self.client.config().0.federation_name;
        let event =
            Event::received_lightning(federation_id.clone(), invoice.payment_hash().to_string());
        self.event_sink.event(&event);
    }

    fn send_received_on_chain_payment_event(&self, txid: &Txid, address: &Address) {
        let federation_id = self.client.config().0.federation_name;
        let event = Event::received_bitcoin(federation_id.clone(), txid, address);
        self.event_sink.event(&event);
    }

    pub async fn event_loop(&self) {
        let mut last_consensus_block_height = self.block_height().await.ok();
        let mut last_poll = SystemTime::now();
        let mut last_outgoing_check = SystemTime::now();
        loop {
            // on-chain
            let current_block_height = self.block_height().await.ok();
            if last_consensus_block_height != current_block_height {
                self.attempt_pegins();
                last_consensus_block_height = current_block_height;
            }

            // incoming lightning payments
            self.poll_incoming_ln();

            // check for refunds once per minute
            if last_outgoing_check
                .elapsed()
                .expect("Unix time not available")
                > Duration::from_secs(60)
            {
                if let Some(height) = last_consensus_block_height {
                    self.poll_ln_refunds(height);
                }
                last_outgoing_check = SystemTime::now();
            }

            // update our balance just in case
            self.poll_balance();

            let poll_duration = last_poll.elapsed().expect("couldn't get system time");
            tracing::info!("poll {:?}", poll_duration);
            fedimint_api::task::sleep(std::time::Duration::from_secs(1)).await;
            last_poll = SystemTime::now();
        }
    }

    pub fn poll_balance(&self) {
        let fed = self.clone();
        tokio::spawn(async move {
            fed.update_balance().await;
        });
    }

    pub fn poll_incoming_ln(&self) {
        let fed = self.clone();
        let pending_payments: Vec<Payment> = fed
            .list_payments()
            .into_iter()
            // TODO: should we filter
            .filter(|payment| !payment.paid() && !payment.expired() && payment.incoming())
            .collect();

        tokio::spawn(async move {
            // Try to complete incoming payments
            pending_payments
                .iter()
                .map(|payment| async {
                    // FIXME: don't create rng in here ...
                    let invoice_expired = payment.invoice.is_expired();
                    let rng = rand::rngs::OsRng;
                    let payment_hash = payment.invoice.payment_hash();
                    tracing::debug!("fetching incoming contract {:?}", &payment_hash);
                    let result = &fed
                        .client
                        .claim_incoming_contract(
                            ContractId::from_hash(payment_hash.clone()),
                            rng.clone(),
                        )
                        .await;
                    if let Err(_) = result {
                        tracing::debug!("couldn't complete payment: {:?}", &payment_hash);
                        // Mark it "expired" in db if we couldn't claim it and invoice is expired
                        if invoice_expired {
                            fed.update_payment_status(payment_hash, PaymentStatus::Expired).await;
                        }
                    } else {
                        tracing::info!("completed payment: {:?}", &payment_hash);
                        fed.update_payment_status(payment_hash, PaymentStatus::Paid).await;
                        fed.update_balance().await;
                        fed.send_received_lightning_payment_event(&payment.invoice);
                        let amount = payment
                            .invoice
                            .amount_milli_satoshis()
                            .expect("assuming we only receive payments for invoices with amount");
                        fed.save_transaction(&Transaction::new(false, amount)).await;
                    }
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;
        });
    }

    pub fn poll_ln_refunds(&self, consensus_block_height: u64) {
        let fed = self.clone();
        let contracts = fed
            .client
            .ln_client()
            .refundable_outgoing_contracts(consensus_block_height);

        tokio::spawn(async move {
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
                            fed.update_balance().await;
                        }
                        Err(e) => tracing::info!("refund failed {:?}", e),
                    };
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;
        });
    }
}
