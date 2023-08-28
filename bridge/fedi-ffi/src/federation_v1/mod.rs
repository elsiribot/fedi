mod dev;
pub mod social;
mod utils;

use std::{default::Default, str::FromStr, sync::Arc, time::Duration};

use anyhow::{anyhow, bail, Context};
use bitcoin::{
    secp256k1::{Message, PublicKey, Secp256k1, XOnlyPublicKey},
    Network,
};
use fedi_social_client::{common::VerificationDocument, FediSocialClientGen, RecoveryId};
use fedimint_client::{
    backup::Metadata, get_client_root_secret, sm::OperationId, ClientBuilder, ClientSecret,
};
use fedimint_core::{
    api::{DynModuleApi, GlobalFederationApi, IGlobalFederationApi},
    config::FederationId,
    db::IDatabase,
    task::timeout,
    Amount, PeerId,
};
use fedimint_derive_secret::{ChildId, DerivableSecret};
use fedimint_ln_client::{
    network_to_currency, InternalPayState, LightningClientExt, LightningClientGen,
    LightningClientModule, LightningMeta, LnPayState, LnReceiveState, PayType,
};
use fedimint_mint_client::{
    parse_ecash, serialize_ecash, MintClientExt, MintClientGen, MintClientModule, MintMeta,
    MintMetaVariants, ReissueExternalNotesState,
};
use fedimint_wallet_client::WalletClientGen;
use fedimint_wallet_client::WalletClientModule;
use futures::StreamExt;
use lightning_invoice::Invoice;
use tracing::{debug, error, info, warn};

use crate::{
    constants::{BACKUP_FREQUENCY, NOSTR_CHILD_ID},
    federation_v1::{social::SOCIAL_RECOVERY_SECRET_CHILD_ID, utils::display_currency},
    types::{MultiClientConfig, SocialRecoveryQr},
};

use self::{
    dev::{
        override_localhost_client_config, override_localhost_gateway,
        override_localhost_invite_code,
    },
    social::{
        RecoveryFile, SocialBackup, SocialRecovery, SocialRecoveryState, SocialVerification,
        UserSeedPhrase,
    },
    utils::required_threashold_of,
};

use super::{
    constants::{
        LNURL_CHILD_ID, ONE_YEAR, PAY_INVOICE_TIMEOUT, SHUTDOWN_TIMEOUT, XMPP_CHILD_ID,
        XMPP_KEYPAIR_SEED, XMPP_PASSWORD,
    },
    event::EventSink,
    storage::FediFile,
    types::{
        federation_v1_to_rpc_federation, FediBackupMetadata, RpcAmount, RpcInvoice,
        RpcLightningGatewayV1, RpcPayInvoiceResponse, RpcPublicKey, RpcRecoveryId,
        RpcSignedLnurlMessage, RpcXmppCredentials, SocialRecoveryApproval,
    },
};
use super::{
    event::{Event, TypedEventExt},
    storage::Storage,
};
use anyhow::Result;
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_core::api::{InviteCode, WsFederationApi};
use fedimint_core::config::ClientConfig;
use fedimint_core::{db::DatabaseTransaction, task::TaskGroup};

use fedimint_client::Client;

/// Federation is a wrapper of "client ng" to assist with handling RPC commands
#[derive(Clone)]
pub struct FederationV1 {
    pub client: Arc<Client>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    pub fedi_file: Arc<FediFile>,
}

impl FederationV1 {
    /// Instantiate Federation from FediConfig
    fn build_client_builder(client_config: ClientConfig, db: Box<dyn IDatabase>) -> ClientBuilder {
        let mut client_builder = ClientBuilder::default();
        client_builder.with_module(MintClientGen);
        client_builder.with_module(LightningClientGen);
        client_builder.with_module(WalletClientGen(None));
        client_builder.with_module(FediSocialClientGen);
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
        client_builder.with_module(FediSocialClientGen);
        client_builder.with_primary_module(1);
        client_builder.with_config(client_config);
        client_builder.with_old_client_database(old_client);
        client_builder
    }

    /// Constructor which starts a bunch of async tasks and ensures username is saved to db (e.g. after recovery)
    pub async fn new(
        ng: Arc<Client>,
        event_sink: EventSink,
        task_group: TaskGroup,
        fedi_file: Arc<FediFile>,
    ) -> Self {
        let mut federation = Self {
            client: ng,
            event_sink,
            task_group,
            fedi_file,
        };
        federation.subscribe_balance_updates().await;
        // FIXME: this breaks backup and recovery test
        // federation.poll_scheduled_backups().await;
        federation.subscribe_to_all_operations().await;
        federation
    }

    /// Instantiate Federation from FediConfig
    pub async fn from_config(
        client_config: ClientConfig,
        db: Box<dyn IDatabase>,
        event_sink: EventSink,
        task_group: TaskGroup,
        fedi_file: Arc<FediFile>,
    ) -> anyhow::Result<Self> {
        let client_builder = Self::build_client_builder(client_config.clone(), db);
        let ng = client_builder.build::<Bip39RootSecretStrategy>().await?;
        Ok(Self::new(
            Arc::new(ng),
            event_sink,
            task_group.make_subgroup().await,
            fedi_file,
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
        fedi_file: Arc<FediFile>,
    ) -> Result<Self> {
        // Download federation config
        let mut invite_code: InviteCode = InviteCode::from_str(&invite_code_string)?;
        override_localhost_invite_code(&mut invite_code);
        let api = Arc::new(WsFederationApi::from_invite_code(&[invite_code.clone()]))
            as Arc<dyn IGlobalFederationApi + Send + Sync + 'static>;
        let mut client_config: ClientConfig =
            api.as_ref().download_client_config(&invite_code).await?;
        override_localhost_client_config(&mut client_config);

        // Save invite code to db
        // FIXME: race condition if this is after Self::from_config
        fedi_file
            .join_federation(
                invite_code.id,
                invite_code_string,
                MultiClientConfig::V1(client_config.clone()),
            )
            .await?;

        // Instantiate Federation
        let federation_id: FederationId = client_config.federation_id;
        let dyn_db = storage.federation_idb(&federation_id).await?;
        let federation =
            Self::from_config(client_config, dyn_db, event_sink, task_group, fedi_file).await?;

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

    /// Return federation name from meta, or take first 8 characters of federation ID
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
        let (mint_client, _) = self
            .client
            .get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
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
            .create_bolt11_invoice(amount.0, description, expiry_time)
            .await?;

        self.subscribe_invoice(operation_id, invoice.clone())
            .await?;

        Ok(invoice.try_into()?)
    }

    /// Subscribe to state updates for a given lightning invoice
    pub async fn subscribe_invoice(
        &self,
        operation_id: OperationId,
        _invoice: Invoice, // TODO: fetch the invoice from the db
    ) -> Result<()> {
        let fed = self.clone();
        self.task_group
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
                            fed.send_transaction_event();
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
                                return Ok(RpcPayInvoiceResponse {
                                    preimage: preimage.to_public_key()?.to_string(),
                                });
                            }
                            InternalPayState::RefundSuccess { .. } => {
                                bail!("Internal lightning payment failed, got refund");
                            }
                            InternalPayState::RefundError { .. } => {
                                bail!("Internal lightning payment failed, didn't get refund");
                            }
                            InternalPayState::FundingFailed { .. } => {
                                bail!("Failed to fund internal lightning payment");
                            }
                            InternalPayState::UnexpectedError(e) => {
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
                        match update {
                            LnPayState::Success { preimage } => {
                                return Ok(RpcPayInvoiceResponse { preimage });
                            }
                            LnPayState::Refunded { gateway_error } => {
                                return Err(gateway_error.into());
                            }
                            LnPayState::Canceled { .. } => {
                                bail!("Lightning payment failed, got refund")
                            }
                            LnPayState::UnexpectedError { error_message } => {
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

    /// Start background task to listen for balance updates and emit "federation" events when one is observed
    async fn subscribe_balance_updates(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} balance subscription", federation.federation_name()),
                |_| async move {
                    let mut updates = federation.client.subscribe_balance_changes().await;
                    while let Some(_) = updates.next().await {
                        federation.send_federation_event().await;
                    }
                },
            )
            .await;
    }

    fn send_transaction_event(&self) {
        let event = Event::transaction_v2(self.federation_id());
        self.event_sink.typed_event(&event);
    }

    /// Send whenever the balance or social recovery state changes
    pub async fn send_federation_event(&self) {
        let rpc_federation = federation_v1_to_rpc_federation(&Arc::new(self.clone())).await;
        let event = Event::federation(rpc_federation).await;
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

    /// Receive ecash
    pub async fn receive_ecash(&self, ecash: String) -> Result<Amount> {
        let ecash = parse_ecash(&ecash)?;
        let amount = ecash.total_amount();
        // TODO: include metadata as 2nd argument
        let operation_id = self.client.reissue_external_notes(ecash, ()).await?;
        // FIXME: not saving operation id
        self.subscribe_to_ecash_reissue(operation_id).await?;
        Ok(amount)
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
        let username = self.fedi_file.get_xmpp_username(self.federation_id()).await;
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
                self.fedi_file
                    .save_xmpp_username(self.federation_id(), &username)
                    .await?;
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
        fedi_file: Arc<FediFile>,
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
            fedi_file,
        )
        .await;

        federation.save_restored_metadata(metadata).await?;

        Ok(federation)
    }

    /// Wipe state and shutdown tasks
    /// FIXME: maybe we should split this into 2 methods?
    pub async fn prepare_for_recovery(&self) -> Result<Client> {
        self.client.wipe_state().await?;
        self.task_group
            .clone() // FIXME: remove this clone
            .shutdown_join_all(Some(SHUTDOWN_TIMEOUT))
            .await?;
        let client: Client = self.client.as_ref().clone();
        Ok(client)
    }

    //
    // Social Recovery
    //

    /// Generate social recovery secret from root secret
    pub fn social_recovery_secret_static(root_secret: &DerivableSecret) -> DerivableSecret {
        assert_eq!(root_secret.level(), 0);
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
            module_secret: Self::social_recovery_secret_static(&self.root_secret().await),
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

    /// Attempt to continue a previous social recovery session by loading state from DB
    pub async fn social_recovery_continue(&self) -> Result<SocialRecovery> {
        let state = self
            .fedi_file
            .get_social_recovery_state(self.federation_id())
            .await
            .ok_or(anyhow!("no active recovery session"))?;
        self.social_recovery_continue_inner(state).await
    }

    /// Get social verification client for a guardian
    pub async fn social_verification(&self, peer_id: PeerId) -> Result<SocialVerification> {
        let client_config = self.decoded_config().await?;
        let (module_id, _cfg) = client_config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        Ok(SocialVerification::new(
            module_id,
            self.social_api(),
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

    /// Start a new social recovery session if one doesn't exist already
    /// FIXME: This will lead to bugs because if someone gets stuck inside a session there will be no way to exist
    /// Also won't be able to do simulataneous recoveries in 2 federations.
    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        let recovery_client = match self.social_recovery_continue().await {
            Ok(recovery_client) => recovery_client,
            Err(_) => {
                let recovery_client = self.social_recovery_start(recovery_file.clone()).await?;
                self.fedi_file
                    .save_social_recovery_state(
                        self.federation_id(),
                        recovery_client.state().clone(),
                    )
                    .await?;
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
            self.fedi_file
                .save_social_recovery_id(self.federation_id(), recovery_id)
                .await?;
        }
        self.send_federation_event().await;
        Ok(())
    }

    /// Get social recovery Id from the DB. This is used to generate the recovery QR.
    /// FIXME: just put this in social recovery state
    pub async fn get_social_recovery_id(&self) -> Option<RecoveryId> {
        self.fedi_file
            .get_social_recovery_id(self.federation_id())
            .await
    }

    /// Save social recovery ID to the DB. This is used to generate the recovery QR.
    pub async fn save_social_recovery_id(&self, recovery_id: &RecoveryId) -> Result<()> {
        self.fedi_file
            .save_social_recovery_id(self.federation_id(), *recovery_id)
            .await?;
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
        self.fedi_file
            .save_social_recovery_state(self.federation_id(), recovery_client.state().clone())
            .await?;

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
    pub async fn delete_social_recovery_state_and_id(&self) -> Result<()> {
        self.fedi_file
            .reset_social_recovery(self.federation_id())
            .await?;
        // FIXME: a little weird to call this here ...
        self.send_federation_event().await;
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

    /// Get Nostr public key
    pub async fn get_nostr_pub_key(&self) -> XOnlyPublicKey {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret().await;
        let nostr_secret = root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let nostr_pubkey = nostr_keypair.x_only_public_key();
        nostr_pubkey.0
    }

    /// Sign Nostr event
    pub async fn sign_nostr_event(&self, event_hash: String) -> Result<String> {
        let secp = Secp256k1::new();
        let root_secret = self.root_secret().await;
        let nostr_secret = root_secret.child_key(ChildId(NOSTR_CHILD_ID));
        let nostr_keypair = nostr_secret.to_secp_key(&secp);
        let data = &hex::decode(event_hash)?;
        let message = Message::from_slice(data)?;
        let sig = secp.sign_schnorr(&message, &nostr_keypair);
        // Return hex-encoded string
        Ok(format!("{}", sig))
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
        let username = self.fedi_file.get_xmpp_username(self.federation_id()).await;

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
        if let Some(last_backup) = self
            .fedi_file
            .get_last_backup_timestamp(self.federation_id())
            .await
        {
            if now.duration_since(last_backup)? < BACKUP_FREQUENCY {
                return Ok(());
            }
        };

        // FIXME: this potentially prevents race conditions, but degrades recovery for federations without chat
        // Username is present
        if self
            .fedi_file
            .get_xmpp_username(self.federation_id())
            .await
            .is_none()
        {
            return Ok(());
        }

        // Do backup and save timestamp to db
        self.backup().await?;
        self.fedi_file
            .save_last_backup_timestamp(self.federation_id(), now)
            .await?;

        info!("Finished periodic backup");
        Ok(())
    }

    /// Background task which does a backup with the federation twice per day
    async fn _poll_scheduled_backups(&mut self) {
        let federation = self.clone();
        self.task_group
            .spawn(
                format!("{:?} scheduled backups", federation.federation_name()),
                |_| async move {
                    loop {
                        // TODO: select!
                        if let Err(e) = federation.scheduled_backup().await {
                            warn!("Error executing scheduled backup {e:?}");
                        }
                        // We check if a backup is due every 10 seconds
                        fedimint_core::task::sleep(Duration::from_secs(10)).await;
                    }
                },
            )
            .await;
    }
}
