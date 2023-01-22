use std::{
    collections::HashMap,
    default::Default,
    fs::{self, File},
    path::{Path, PathBuf},
    str::FromStr,
    sync::Arc,
};

use crate::{
    event::Event,
    mnemonic::Mnemonic,
    payment::{Payment, PaymentDirection, PaymentKey, PaymentKeyPrefix, PaymentStatus},
    recovery::{SocialRecoveryApproval, SocialRecoveryQr, SocialRecoveryStateKey},
    tx::{
        IncomingBitcoinTransactionStatus, Transaction, TransactionDirection, TransactionKey,
        TransactionKeyPrefix,
    },
    types::hacky_lightning_invoice_fee,
    EventSinkWrapper,
};
use anyhow::{anyhow, Result};
use bitcoin::{
    hashes::sha256,
    secp256k1::{ecdsa::Signature, Message, PublicKey, Secp256k1, SecretKey},
    Address, Network, Script, Txid,
};
use electrum_client::{Client, ElectrumApi};
use fedi_social::common::{RecoveryId, VerificationDocument};
use fedimint_api::db::Database;
use fedimint_api::{
    config::{ClientConfig, ConfigResponse},
    PeerId,
};
use fedimint_api::{db::DatabaseTransaction, task::TaskGroup};
use fedimint_core::modules::ln::contracts::{ContractId, IdentifyableContract};
use fedimint_core::{config::load_from_file, modules::wallet::txoproof::TxOutProof};
use fedimint_sled::SledDb;
use futures::{stream::FuturesUnordered, StreamExt};
use lightning_invoice::Invoice;
use mint_client::{
    api::{GlobalFederationApi, WalletFederationApi, WsFederationApi, WsFederationConnect},
    module_decode_stubs,
    query::CurrentConsensus,
    social::{RecoveryFile, SocialRecovery},
    UserClient, UserClientConfig, UserSeedPhrase,
};
use mint_client::{utils::from_hex, wallet::db::PegInPrefixKey};
use tokio::sync::Mutex;
use tracing::{debug, error, info};

type FederationId = String;

const GAP_LIMIT: usize = 100;
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

fn required_threashold_of(n: usize) -> usize {
    n - ((n - 1) / 3)
}

async fn load_federations_from_disk(
    data_dir: &PathBuf,
    event_sink: Arc<EventSinkWrapper>,
    task_group: &TaskGroup,
) -> Vec<Federation> {
    let mut federations = vec![];
    for element in data_dir.read_dir().unwrap() {
        let mut path = element.unwrap().path();
        if let Some(extension) = path.extension() {
            if extension == "json" {
                // TODO: perhaps this should be a federation method?
                let cfg: UserClientConfig = load_from_file(&path).expect("invalid cfg on disk"); // FIXME: this panics
                path.set_extension("db");
                let db = SledDb::open(path, "client").unwrap(); // FIXME: don't unwrap
                let db = Database::new(db, module_decode_stubs());
                let client =
                    UserClient::new(cfg.clone(), module_decode_stubs(), db, Default::default())
                        .await;
                let federation =
                    Federation::new(client, event_sink.clone(), task_group.make_subgroup().await);
                federations.push(federation)
            }
        }
    }
    federations
}

pub struct Bridge {
    /// Where dbs & configs are stored. Result of calling getApplicationDocumentsDirectory() in Dart.
    pub data_dir: PathBuf,
    pub federations: Arc<Mutex<HashMap<FederationId, Arc<Federation>>>>,
    pub event_sink: Arc<EventSinkWrapper>,
    pub task_group: TaskGroup,
}

impl Bridge {
    pub async fn new(data_dir: PathBuf, event_sink: Arc<EventSinkWrapper>) -> Self {
        // load federations from disk
        let task_group = TaskGroup::new();
        let mut federations_map = HashMap::new();
        let federations_vec =
            load_federations_from_disk(&data_dir, event_sink.clone(), &task_group).await;

        // start pollers
        for mut federation in federations_vec.into_iter() {
            federation.start_pollers().await;
            federations_map.insert(federation.name(), Arc::new(federation));
        }

        let bridge = Self {
            data_dir,
            federations: Arc::new(Mutex::new(federations_map)),
            task_group,
            event_sink,
        };
        bridge
    }

    pub async fn stop_pollers(&self) -> Result<()> {
        self.task_group.clone().shutdown_join_all().await
    }

    /// Adds federation to "federations" and starts polling (if we haven't already joined)
    pub async fn join_federation(&self, connect_string: String) -> Result<Federation> {
        let mut federation = Federation::join(
            connect_string,
            self.data_dir.clone(),
            self.event_sink.clone(),
            self.task_group.make_subgroup().await,
        )
        .await?;
        let mut federations = self.federations.lock().await;
        let federation_name = federation.name();
        if !federations.contains_key(&federation_name) {
            federation.start_pollers().await;
            federations.insert(federation_name, Arc::new(federation.clone()));
        };
        Ok(federation)
    }

    pub async fn get_federation(&self, federation_id: &str) -> Option<Arc<Federation>> {
        let lock = self.federations.lock().await;
        lock.get(federation_id).map(|federation| federation.clone())
    }

    pub async fn recover_from_mnemonic(
        &self,
        federation_id: &str,
        mnemonic: &Mnemonic,
    ) -> Result<()> {
        self.stop_pollers().await?;

        let entropy = mnemonic.to_entropy();
        let entropy: [u8; 16] = entropy[0..16]
            .try_into()
            .expect("mnemonic entropy array of wrong size");

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
            let new_client = UserClient::new(config, module_decode_stubs(), db.clone(), secp).await;
            fed.client = Arc::new(new_client);

            // start pollers
            fed.start_pollers().await;

            feds.insert(federation_id.to_string(), Arc::new(fed.clone()));
            fed
        };

        // recover ecash tokens
        fed.restore_ecash_from_federation().await?;

        Ok(())
    }

    /// Deletes federation client database and config
    /// Returns error if use has a balance
    pub async fn leave_federation(&self, federation_id: &str) -> anyhow::Result<()> {
        info!("called leave");
        // Error if we don't recognize federation
        let federation = self
            .get_federation(federation_id)
            .await
            .ok_or(anyhow!("Federation not found"))?;

        // Stop pollers
        info!("stopping pollers");
        federation.stop_pollers().await?;

        // Remove config and db
        // FIXME: this should all be atomic
        info!("deleting configs");
        let json_path = Path::new(&self.data_dir)
            .join(&federation_id)
            .with_extension("json");
        let db_path = Path::new(&self.data_dir)
            .join(&federation_id)
            .with_extension("db");
        fs::remove_file(json_path)?;
        fs::remove_dir_all(db_path)?;

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
    pub client: Arc<UserClient>,
    pub event_sink: Arc<EventSinkWrapper>,
    pub task_group: TaskGroup,
}

impl Federation {
    pub fn new(
        client: UserClient,
        event_sink: Arc<EventSinkWrapper>,
        task_group: TaskGroup,
    ) -> Self {
        Self {
            client: Arc::new(client),
            event_sink,
            task_group,
        }
    }

    pub fn name(&self) -> String {
        self.client.config().0.federation_name.clone()
    }

    // FIXME: move this to actually using config.federation_id
    pub fn id(&self) -> String {
        self.client.config().0.federation_name.clone()
    }

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

    async fn dbtx(&self) -> DatabaseTransaction<'_> {
        self.client.db().begin_transaction().await
    }

    pub fn network(&self) -> bitcoin::Network {
        self.client.wallet_client().config.network
    }

    pub async fn join(
        connect_string: String,
        data_dir: PathBuf,
        event_sink: Arc<EventSinkWrapper>,
        task_group: TaskGroup,
    ) -> Result<Self> {
        // Download federation config
        let connect_cfg: WsFederationConnect = serde_json::from_str(&connect_string)?;
        tracing::info!("parsed connection string");
        let api = WsFederationApi::new(connect_cfg.members);
        tracing::info!("fetching config");
        let res: ConfigResponse = api.download_client_config().await?;
        let cfg = res.client;

        // Hack to run against local federation
        let mut cfg_string = serde_json::to_string(&cfg).unwrap();
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
        let cfg: ClientConfig = serde_json::from_str(&cfg_string)?;

        // Save config
        let cfg_path = Path::new(&data_dir).join(format!("{}.json", cfg.federation_name));
        tracing::info!("saving file to {}", cfg_path.display());
        let file = File::create(cfg_path) // FIXME: this should probably use tokio's `File`
            .expect("Could not create cfg file");
        serde_json::to_writer_pretty(file, &cfg).expect("Could not write gateway cfg");

        // Create user client
        let db_path = Path::new(&data_dir).join(format!("{}.db", cfg.federation_name));
        let db = SledDb::open(db_path, "client").unwrap(); // FIXME: don't unwrap
        let db = Database::new(db, module_decode_stubs());
        let client = UserClient::new(
            UserClientConfig(cfg.clone()),
            module_decode_stubs(),
            db,
            Default::default(),
        )
        .await;
        Ok(Self::new(client, event_sink, task_group))
    }

    pub fn sign_with_node_privkey(&self, msg: &Message) -> Signature {
        // TODO: don't hardcode
        let secret_key =
            SecretKey::from_str("0000000000000000000000000000000000000000000000000000000000000001")
                .unwrap();
        let secp = Secp256k1::new();
        secp.sign_ecdsa(&msg, &secret_key)
    }

    pub fn node_pubkey(&self) -> PublicKey {
        // TODO: don't hardcode
        let secret_key =
            SecretKey::from_str("0000000000000000000000000000000000000000000000000000000000000001")
                .unwrap();
        let secp = Secp256k1::new();
        secret_key.public_key(&secp)
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
        ))
        .await;
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
    pub async fn can_pay(&self, invoice: &Invoice) -> bool {
        self.list_payments()
            .await
            .iter()
            .filter(|payment| payment.outgoing() && &payment.invoice == invoice)
            .next()
            .is_none()
    }

    pub async fn list_scripts(&self) -> Vec<Script> {
        self.dbtx()
            .await
            .find_by_prefix(&PegInPrefixKey)
            .await
            .map(|res| {
                let (key, _) = res.expect("DB error");
                key.peg_in_script
            })
            .collect()
    }

    pub async fn pegin_script(&self, script: &Script) -> Result<()> {
        let electrum = Client::new(&self.electrum_url()?)?;
        let history = electrum.script_get_history(&script)?;
        for item in history {
            let url = self.txout_proof_url(&item.tx_hash)?;
            if let Ok(raw_txout_proof) = reqwest::get(url).await?.text().await {
                // Skip if we've already claimed it
                match self.fetch_transaction(item.tx_hash.to_string()).await {
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
                    Address::from_script(script, self.client.wallet_client().config.network)
                        .unwrap();
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
                let amount = fedimint_api::Amount::from_sats(amount_sats);
                if let Err(_) = self
                    .client
                    .peg_in(txout_proof.clone(), btc_transaction.clone(), rng)
                    .await
                {
                    // Save pending tx if we haven't already, move on to next one
                    if self
                        .fetch_transaction(item.tx_hash.to_string())
                        .await
                        .is_none()
                    {
                        self.save_transaction(&Transaction::bitcoin(
                            TransactionDirection::Receive,
                            amount,
                            fee,
                            address,
                            item.tx_hash,
                            Some(IncomingBitcoinTransactionStatus::Pending),
                        ))
                        .await;
                    }
                    continue;
                }

                tracing::info!("peg-in successful for {}", address);
                self.update_balance().await;
                // FIXME: helper to replace existing transaction
                let mut tx = self
                    .fetch_transaction(item.tx_hash.to_string())
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
                let mut details = tx.bitcoin.expect("this should exist (fixme)");
                details.incoming_status = Some(IncomingBitcoinTransactionStatus::Complete);
                tx.bitcoin = Some(details);
                self.save_transaction(&tx).await;
            }
        }

        Ok(())
    }

    pub async fn attempt_pegins(&self) {
        tracing::info!("attempting pegins");
        let fed = self.clone();
        let scripts = fed.list_scripts().await;
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
        if !self.can_pay(&invoice).await {
            return Err(anyhow!("Can't pay invoice twice"));
        }

        match self.pay_invoice_inner(&invoice).await {
            Ok(_) => {
                let fee = Some(hacky_lightning_invoice_fee(invoice)?);
                self.save_payment(&Payment::new(
                    invoice.clone(),
                    PaymentStatus::Paid,
                    PaymentDirection::Outgoing,
                ))
                .await;
                self.update_balance().await;
                self.save_transaction(&Transaction::lightning(
                    TransactionDirection::Send,
                    fedimint_api::Amount::from_msats(
                        invoice
                            .amount_milli_satoshis()
                            .expect("assuming invoice has amount"),
                    ),
                    fee,
                    invoice.clone(),
                ))
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

    pub async fn save_transaction(&self, tx: &Transaction) {
        // TODO: need to expose the database
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&TransactionKey(tx.id.clone()), tx)
            .await
            .expect("Db error");
        dbtx.commit_tx().await.expect("Db error");
        // notify UI
        self.transaction_event(&tx);
    }

    pub async fn fetch_transaction(&self, id: String) -> Option<Transaction> {
        self.dbtx()
            .await
            .get_value(&TransactionKey(id))
            .await
            .expect("Db error")
    }

    pub async fn update_transaction_notes(&self, id: String, notes: String) -> Result<()> {
        match self.fetch_transaction(id).await {
            Some(mut tx) => {
                tx.notes = notes;
                self.save_transaction(&tx).await;
                Ok(())
            }
            None => Err(anyhow!("Transaction not found")),
        }
    }

    // TODO: pagination
    pub async fn list_transactions(&self) -> Vec<Transaction> {
        let mut transactions: Vec<Transaction> = self
            .dbtx()
            .await
            .find_by_prefix(&TransactionKeyPrefix)
            .await
            .map(|res| res.expect("Db error").1)
            .collect();
        // Sort by timestamp, descending
        transactions.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        transactions
    }

    pub async fn save_payment(&self, payment: &Payment) {
        // TODO: need to expose the database
        tracing::info!("saving payment");
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&PaymentKey(payment.invoice.payment_hash().clone()), payment)
            .await
            .expect("Db error");
        dbtx.commit_tx().await.expect("Db error");
        tracing::info!("saved payment");
    }

    pub async fn list_payments(&self) -> Vec<Payment> {
        self.dbtx()
            .await
            .find_by_prefix(&PaymentKeyPrefix)
            .await
            .map(|res| res.expect("Db error").1)
            .collect()
    }

    pub async fn fetch_payment(&self, payment_hash: &sha256::Hash) -> Option<Payment> {
        self.dbtx()
            .await
            .get_value(&PaymentKey(payment_hash.clone()))
            .await
            .expect("Db error")
    }

    pub async fn update_payment_status(&self, payment_hash: &sha256::Hash, status: PaymentStatus) {
        if let Some(mut payment) = self.fetch_payment(&payment_hash).await {
            payment.status = status;
            let mut dbtx = self.dbtx().await;
            dbtx.insert_entry(&PaymentKey(*payment_hash), &payment)
                .await
                .expect("Db error");
            dbtx.commit_tx().await.expect("Db error");
        }
        // TODO: what to do if this payment doesn't exist?
    }

    pub async fn already_paid_invoice(&self, invoice: &Invoice) -> bool {
        self.list_payments()
            .await
            .iter()
            .filter(|payment| payment.outgoing() && &payment.invoice == invoice)
            .next()
            .is_some()
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
        self.send_balance_notification().await;
    }

    async fn send_balance_notification(&self) {
        let balance_millis = self.client.coins().await.total_amount().msats;
        let event = Event::balance(self.id(), balance_millis);
        self.event_sink.event(&event);
    }

    fn transaction_event(&self, tx: &Transaction) {
        let event = Event::transaction(self.id(), tx.clone());
        self.event_sink.event(&event);
    }

    pub async fn get_mnemonic(&self) -> Mnemonic {
        let client_secret = self.client.get_client_secret().await;
        // FIXME: use all the entropy
        Mnemonic::from_entropy(&client_secret.entropy())
    }

    pub async fn restore_ecash_from_federation(&self) -> Result<()> {
        let mut task_group = TaskGroup::new();
        self.client
            .mint_client()
            .restore_ecash_from_federation(GAP_LIMIT, &mut task_group)
            .await??;
        self.update_balance().await;
        Ok(())
    }

    pub async fn back_up_ecash_to_federation(&self) -> Result<()> {
        self.client
            .mint_client()
            .back_up_ecash_to_federation()
            .await?;
        Ok(())
    }

    pub async fn upload_backup_file(
        &self,
        video_file_path: &PathBuf,
        datadir: &PathBuf,
    ) -> Result<PathBuf> {
        debug!("uploading backup file {:?}", video_file_path);
        let file_contents = fs::read(video_file_path)?;
        let verification_doc = VerificationDocument::from_raw(&file_contents);
        // FIXME: two different forms of seed phrase
        let seed_phrase = UserSeedPhrase::from(self.get_mnemonic().await.to_string());

        let backup_client = self.client.social_backup();
        let recovery_file =
            backup_client.prepare_recovery_file(verification_doc.clone(), seed_phrase.clone());
        backup_client
            .upload_backup_to_federation(&recovery_file)
            .await?;
        // FIXME: is this a good filename?
        let recovery_file_path = datadir.join(RECOVERY_FILENAME);
        fs::write(&recovery_file_path, recovery_file.to_bytes())?;
        Ok(recovery_file_path)
    }

    pub async fn social_recovery_continue(&self) -> Result<SocialRecovery> {
        let mut dbtx = self.dbtx().await;
        let state = dbtx
            .get_value(&SocialRecoveryStateKey(self.id()))
            .await
            .expect("Db error")
            .ok_or(anyhow!("no active recovery session"))?;
        Ok(self.client.social_recovery_continue(state))
    }

    pub async fn social_recovery_save(&self, recovery_client: &SocialRecovery) {
        // FIXME: should I pass dbtx from outside?
        let mut dbtx = self.dbtx().await;
        dbtx.insert_entry(&SocialRecoveryStateKey(self.id()), recovery_client.state())
            .await
            .expect("Db error");
        dbtx.commit_tx().await.expect("Db error");
    }

    /// Start a new social recovery session if one doesn't exist already
    /// FIXME: This will lead to bugs because if someone gets stuck inside a session there will be no way to exist
    /// Also won't be able to do simulataneous recoveries in 2 federations.
    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        match self.social_recovery_continue().await {
            Ok(recovery_client) => recovery_client,
            Err(_) => {
                let recovery_client = self.client.social_recovery_start(recovery_file.clone())?;
                self.social_recovery_save(&recovery_client).await;
                recovery_client
            }
        };
        Ok(())
    }

    // TODO: this should probably be able to find recovery file by itself. just need to put it in expected path.
    pub async fn social_recovery_qr(
        &self,
        recovery_file: &RecoveryFile,
    ) -> Result<SocialRecoveryQr> {
        let recovery_client = self.social_recovery_continue().await?;

        // Create and upload verification request
        // FIXME: probably shouldn't clone verification doc because it might be large
        let verification_request = recovery_client
            .create_verification_request(recovery_file.verification_document.clone())?;
        recovery_client
            .upload_verification_request(&verification_request)
            .await
            .unwrap();

        // Return social recovery QR
        let recovery_id = verification_request.recovery_id();
        Ok(SocialRecoveryQr { recovery_id })
    }

    pub async fn social_recovery_approvals(&self) -> Result<(Vec<SocialRecoveryApproval>, usize)> {
        let mut recovery_client = self.social_recovery_continue().await?;
        let guardian_peer_ids: Vec<(String, PeerId)> = self
            .client
            .config()
            .0
            .nodes
            .iter()
            .enumerate()
            .map(|(i, node)| (node.name.clone(), PeerId::from(i as u16))) // FIXME: don't use "as"
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
        self.social_recovery_save(&recovery_client).await;

        Ok((approvals, remaining))
    }

    pub async fn social_recovery_combine_shares(&self) -> Result<Mnemonic> {
        let recovery_client = self.social_recovery_continue().await?;
        let seed_phrase = recovery_client.combine_recovered_user_phrase()?;
        let mnemonic = Mnemonic::parse(seed_phrase.0)?;
        Ok(mnemonic)
    }

    pub async fn social_recovery_download_verification_doc(
        &self,
        recovery_id: &RecoveryId,
        // FIXME: remove this argument
        data_dir: PathBuf,
    ) -> Result<Option<PathBuf>> {
        // FIXME: what to do for peer id?
        tracing::info!("downloading verificaiton doc {}", recovery_id);
        let verification_client = self.client.social_verification(PeerId::from(0));
        let verification_doc = verification_client
            .download_verification_doc(*recovery_id)
            .await?;
        if let Some(verification_doc) = verification_doc {
            tracing::info!("downloaded verification doc ... saving to filesystem");
            let path = data_dir.join(VERIFICATION_FILENAME);
            fs::write(&path, verification_doc.to_raw()?)?;
            tracing::info!("saved verificaiton doc");
            return Ok(Some(path));
        };
        tracing::info!("no verificaiton doc found");

        Ok(None)
    }

    pub async fn approve_social_recovery_request(&self, recovery_id: &RecoveryId) -> Result<()> {
        // TODO: figure out which guardian should do the next approval and fire off request to them
        for i in 0..4 {
            let verification_client = self.client.social_verification(PeerId::from(i as u16));
            verification_client.approve_recovery(*recovery_id).await?;
        }
        Ok(())
    }

    // FIXME: this just hangs forever
    pub async fn stop_pollers(&self) -> anyhow::Result<()> {
        // FIXME: is this clone a problem?
        // self.task_group.clone().shutdown_join_all().await
        Ok(())
    }

    pub async fn start_pollers(&mut self) {
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ecash backup poller", self.name()),
                |_handle| async move {
                    fed.poll_ecash_backup().await;
                },
            )
            .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ecash backup poller", self.name()),
                |_handle| async move {
                    fed.poll_balance().await;
                },
            )
            .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ecash backup poller", self.name()),
                |_handle| async move {
                    fed.poll_peg_ins().await;
                },
            )
            .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ecash backup poller", self.name()),
                |_handle| async move {
                    fed.poll_incoming_ln().await;
                },
            )
            .await;
        let fed = self.clone();
        self.task_group
            .spawn(
                format!("{} ecash backup poller", self.name()),
                |_handle| async move {
                    fed.poll_ln_refunds().await;
                },
            )
            .await;
    }

    /// Make an ecash backup once every minute
    pub async fn poll_ecash_backup(&self) {
        loop {
            match self.back_up_ecash_to_federation().await {
                Ok(_) => info!("ecash backup complete"),
                Err(_) => error!("ecash backup failed"),
            }
            fedimint_api::task::sleep(std::time::Duration::from_secs(60)).await;
        }
    }

    /// Checks for peg-ins every second
    pub async fn poll_peg_ins(&self) {
        let mut last_consensus_block_height = None;
        loop {
            let current_block_height = self.block_height().await.ok();
            if last_consensus_block_height != current_block_height {
                self.attempt_pegins().await;
                last_consensus_block_height = current_block_height;
            }
            fedimint_api::task::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    /// Announces balance to event emitter every second
    pub async fn poll_balance(&self) {
        loop {
            self.update_balance().await;
            tracing::debug!("poll balance");
            fedimint_api::task::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    /// Checks for incoming payments every second
    pub async fn poll_incoming_ln(&self) {
        let fed = self.clone();
        loop {
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
                            fed.update_payment_status(payment_hash, PaymentStatus::Expired)
                                .await;
                        }
                    } else {
                        tracing::info!("completed payment: {:?}", &payment_hash);
                        fed.update_payment_status(payment_hash, PaymentStatus::Paid)
                            .await;
                        fed.update_balance().await;
                        let amount = fedimint_api::Amount::from_msats(
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
                        fed.save_transaction(&tx).await;
                    }
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;

            fedimint_api::task::sleep(std::time::Duration::from_secs(1)).await;
        }
    }

    /// Attempts lightning refunds every minute
    pub async fn poll_ln_refunds(&self) {
        let fed = self.clone();

        loop {
            let consensus_block_height = fed.block_height().await.unwrap_or(0);
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
                            fed.update_balance().await;
                        }
                        Err(e) => tracing::info!("refund failed {:?}", e),
                    };
                })
                .collect::<FuturesUnordered<_>>()
                .collect::<Vec<()>>()
                .await;

            // once per minute
            fedimint_api::task::sleep(std::time::Duration::from_secs(60)).await;
        }
    }
}
