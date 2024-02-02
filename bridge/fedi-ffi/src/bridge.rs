use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use std::time::UNIX_EPOCH;
use std::usize;

use anyhow::{anyhow, bail, Context, Result};
use bitcoin::secp256k1::{Message, PublicKey, Secp256k1};
use bitcoin::{Address, XOnlyPublicKey};
use fedi_social_client::{FediSocialCommonGen, RecoveryId};
use fedimint_bip39::Bip39RootSecretStrategy;
use fedimint_client::secret::RootSecretStrategy;
use fedimint_core::api::{DynGlobalApi, InviteCode as InviteCodeV2, WsFederationApi};
use fedimint_core::config::ClientConfig;
use fedimint_core::core::OperationId;
use fedimint_core::encoding::Decodable;
use fedimint_core::module::registry::ModuleDecoderRegistry;
use fedimint_core::module::CommonModuleInit;
use fedimint_core::task::TaskGroup;
use fedimint_core::{Amount, PeerId};
use fedimint_derive_secret::{ChildId, DerivableSecret};
use futures::future::join_all;
use lightning_invoice::Bolt11Invoice;
use rand::distributions::{Alphanumeric, DistString};
use stability_pool_client::ClientAccountInfo;
use tokio::sync::Mutex;
use tracing::{debug, error, info};

use super::event::EventSink;
use super::storage::Storage;
use super::types::{
    multi_federation_to_rpc_federation, RpcAmount, RpcFederation, RpcFederationId, RpcInvoice,
    RpcOperationId, RpcPayInvoiceResponse, RpcPeerId, RpcPublicKey, RpcRecoveryId,
    RpcSignedLnurlMessage, RpcStabilityPoolAccountInfo, RpcTransaction, RpcXmppCredentials,
    SocialRecoveryApproval, SocialRecoveryQr,
};
use crate::constants::{LNURL_CHILD_ID, NOSTR_CHILD_ID};
use crate::error::{get_error_code, ErrorCode};
use crate::event::SocialRecoveryEvent;
use crate::federation_v2::{self, FederationV2};
use crate::social::{self, SocialRecoveryClient, SocialRecoveryState};
use crate::storage::{AppState, FederationInfo, FediFeeSchedule};
use crate::types::{
    GuardianStatus, RpcEcashInfo, RpcFederationPreview, RpcGenerateEcashResponse,
    RpcLightningGateway, RpcPayAddressResponse, RpcReturningMemberStatus,
};
use crate::utils::required_threashold_of;

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

pub enum MultiFederation {
    V2(FederationV2),
}

impl MultiFederation {
    pub fn federation_id(&self) -> RpcFederationId {
        match self {
            Self::V2(multi) => RpcFederationId(multi.federation_id().to_string()),
        }
    }

    pub async fn generate_address(&self) -> Result<String> {
        match self {
            Self::V2(multi) => multi.generate_address().await,
        }
    }

    pub async fn generate_invoice(
        &self,
        amount: RpcAmount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<RpcInvoice> {
        match self {
            Self::V2(multi) => {
                multi
                    .generate_invoice(amount, description, expiry_time)
                    .await
            }
        }
    }

    pub async fn pay_invoice(&self, invoice: &Bolt11Invoice) -> Result<RpcPayInvoiceResponse> {
        match self {
            Self::V2(v2) => v2.pay_invoice(&invoice.clone()).await,
        }
    }

    pub async fn pay_address(
        &self,
        address: Address,
        amount: bitcoin::Amount,
    ) -> Result<RpcPayAddressResponse> {
        info!("pay address amount is {}", amount);
        match self {
            Self::V2(v2) => v2.pay_address(address, amount).await,
        }
    }

    pub async fn list_gateways(&self) -> Result<Vec<RpcLightningGateway>> {
        match self {
            Self::V2(v2) => v2.list_gateways().await,
        }
    }

    pub async fn switch_gateway(&self, gateway_id: &PublicKey) -> Result<()> {
        match self {
            Self::V2(v2) => v2.switch_gateway(gateway_id).await,
        }
    }

    pub async fn get_balance(&self) -> Amount {
        match self {
            Self::V2(v2) => v2.get_balance().await,
        }
    }

    pub async fn guardian_status(&self) -> anyhow::Result<Vec<GuardianStatus>> {
        match self {
            Self::V2(v2) => v2.guardian_status().await,
        }
    }

    pub async fn receive_ecash(&self, ecash: String) -> Result<Amount> {
        match self {
            Self::V2(v2) => v2.receive_ecash(ecash).await,
        }
    }

    pub async fn generate_ecash(&self, amount: Amount) -> Result<RpcGenerateEcashResponse> {
        match self {
            Self::V2(v2) => v2.generate_ecash(amount).await,
        }
    }

    pub async fn cancel_ecash(&self, ecash: String) -> Result<()> {
        match self {
            Self::V2(v2) => {
                v2.cancel_ecash(ecash.parse().context(ErrorCode::BadRequest)?)
                    .await
            }
        }
    }

    pub async fn backup(&self) -> Result<()> {
        match self {
            Self::V2(v2) => v2.backup().await,
        }
    }

    pub async fn get_xmpp_username(&self) -> Option<String> {
        match self {
            Self::V2(v2) => v2.get_xmpp_username().await,
        }
    }

    pub async fn save_xmpp_username(&self, username: &str) {
        match self {
            Self::V2(v2) => v2.save_xmpp_username(username).await,
        }
    }

    pub async fn upload_backup_file(
        &self,
        video_file: Vec<u8>,
        root_mnemonic: bip39::Mnemonic,
    ) -> Result<Vec<u8>> {
        match self {
            Self::V2(v2) => v2.upload_backup_file(video_file, root_mnemonic).await,
        }
    }

    pub async fn download_verification_doc(
        &self,
        recovery_id: RecoveryId,
    ) -> Result<Option<Vec<u8>>> {
        match self {
            Self::V2(v2) => v2.download_verification_doc(&recovery_id).await,
        }
    }

    pub async fn approve_social_recovery_request(
        &self,
        recovery_id: &RecoveryId,
        peer_id: PeerId,
        password: &str,
    ) -> Result<()> {
        match self {
            Self::V2(v2) => {
                v2.approve_social_recovery_request(recovery_id, peer_id, password)
                    .await
            }
        }
    }

    pub async fn list_transactions(
        &self,
        start_time: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<RpcTransaction>> {
        let time = start_time.map(|n| UNIX_EPOCH + std::time::Duration::from_secs(n.into()));
        let operation_id = OperationId::new_random();

        let usize_limit = limit.map_or(usize::MAX as u32, |l| l) as usize;

        Ok(match self {
            Self::V2(v2) => {
                let start_after = time.map(|t| fedimint_client::db::ChronologicalOperationLogKey {
                    creation_time: t,
                    operation_id,
                });
                v2.list_transactions(usize_limit, start_after).await
            }
        })
    }

    pub async fn update_transaction_notes(
        &self,
        transaction_id: String,
        notes: String,
    ) -> anyhow::Result<()> {
        match self {
            Self::V2(v2) => {
                v2.update_transaction_notes(transaction_id.parse()?, notes)
                    .await
            }
        };
        Ok(())
    }

    pub async fn sign_lnurl_message(
        &self,
        message: &Message,
        domain: String,
        global_root_secret: DerivableSecret,
    ) -> RpcSignedLnurlMessage {
        match self {
            Self::V2(_) => {
                let secp = Secp256k1::new();
                let lnurl_secret = global_root_secret.child_key(ChildId(LNURL_CHILD_ID));
                let lnurl_secret_bytes: [u8; 32] = lnurl_secret.to_random_bytes();
                let lnurl_domain_secret =
                    DerivableSecret::new_root(&lnurl_secret_bytes, domain.as_bytes());
                let lnurl_domain_keypair = lnurl_domain_secret.to_secp_key(&secp);
                let lnurl_domain_pubkey = lnurl_domain_keypair.public_key();
                let signature = secp.sign_ecdsa(message, &lnurl_domain_keypair.secret_key());
                RpcSignedLnurlMessage {
                    signature,
                    pubkey: RpcPublicKey(lnurl_domain_pubkey),
                }
            }
        }
    }

    pub async fn get_xmpp_credentials(&self) -> RpcXmppCredentials {
        match self {
            Self::V2(v2) => v2.get_xmpp_credentials().await,
        }
    }

    pub async fn get_nostr_pub_key(
        &self,
        global_root_secret: DerivableSecret,
    ) -> Result<XOnlyPublicKey> {
        match self {
            Self::V2(_) => {
                let secp = Secp256k1::new();
                let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
                let nostr_keypair = nostr_secret.to_secp_key(&secp);
                let nostr_pubkey = nostr_keypair.x_only_public_key();
                Ok(nostr_pubkey.0)
            }
        }
    }

    pub async fn sign_nostr_event(
        &self,
        event_hash: String,
        global_root_secret: DerivableSecret,
    ) -> Result<String> {
        match self {
            Self::V2(_) => {
                let secp = Secp256k1::new();
                let nostr_secret = global_root_secret.child_key(ChildId(NOSTR_CHILD_ID));
                let nostr_keypair = nostr_secret.to_secp_key(&secp);
                let data = &hex::decode(event_hash)?;
                let message = Message::from_slice(data)?;
                let sig = secp.sign_schnorr(&message, &nostr_keypair);
                // Return hex-encoded string
                Ok(format!("{}", sig))
            }
        }
    }

    pub async fn stability_pool_account_info(
        &self,
        force_update: bool,
    ) -> Result<ClientAccountInfo> {
        match self {
            Self::V2(v2) => v2.stability_pool_account_info(force_update).await,
        }
    }

    pub async fn stability_pool_deposit_to_seek(&self, amount: Amount) -> Result<OperationId> {
        match self {
            MultiFederation::V2(v2) => v2.stability_pool_deposit_to_seek(amount).await,
        }
    }

    pub async fn stability_pool_withdraw(
        &self,
        unlocked_amount: Amount,
        locked_bps: u32,
    ) -> Result<OperationId> {
        match self {
            MultiFederation::V2(v2) => {
                v2.stability_pool_withdraw(unlocked_amount, locked_bps)
                    .await
            }
        }
    }

    async fn stability_pool_next_cycle_start_time(&self) -> Result<u64> {
        match self {
            MultiFederation::V2(v2) => v2.stability_pool_next_cycle_start_time().await,
        }
    }

    async fn stability_pool_cycle_start_price(&self) -> Result<u64> {
        match self {
            MultiFederation::V2(v2) => v2.stability_pool_cycle_start_price().await,
        }
    }
}

/// This is instantiated once as a global. When RPC commands come in, this
/// struct is used as a router to look up the federation and handle the RPC
/// command using it.
pub struct Bridge {
    pub storage: Storage,
    pub app_state: AppState,
    pub federations: Arc<Mutex<HashMap<String, Arc<MultiFederation>>>>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
}

impl Bridge {
    pub async fn new(storage: Storage, event_sink: EventSink) -> Result<Self> {
        let task_group = TaskGroup::new();
        let app_state = AppState::load(storage.clone()).await?;

        let root_mnemonic = app_state
            .with_read_lock(move |state| Box::pin(async move { state.root_mnemonic.clone() }))
            .await;

        // load joined federations
        let joined_federations = app_state
            .with_read_lock(move |state| Box::pin(async move { state.joined_federations.clone() }))
            .await
            .into_iter()
            .collect::<Vec<_>>();

        let federations = joined_federations
            .iter()
            // Ignore older version
            .filter(|(_, info)| info.version >= 2)
            .map(|(federation_id_str, federation_info)| async {
                Ok::<(String, Arc<MultiFederation>), anyhow::Error>((
                    federation_id_str.clone(),
                    match federation_info.version {
                        2 => Arc::new(MultiFederation::V2(
                            FederationV2::from_db(
                                storage
                                    .federation_database_v2(&federation_info.database_name)
                                    .await?,
                                event_sink.clone(),
                                task_group.make_subgroup().await,
                                &root_mnemonic,
                                None,
                                get_federation_fedi_fee_schedule(
                                    &app_state,
                                    federation_id_str.clone(),
                                )
                                .await?,
                            )
                            .await
                            .with_context(|| {
                                format!("loading federation {}", federation_id_str.clone())
                            })?,
                        )),
                        n => bail!("Invalid federation version {n}"),
                    },
                ))
            });

        let federations = HashMap::from_iter(futures::future::try_join_all(federations).await?);

        Ok(Self {
            storage,
            app_state,
            federations: Arc::new(Mutex::new(federations)),
            event_sink,
            task_group,
        })
    }

    /// Joins federation from invite code
    ///
    /// Federation ID saved to global database, new rocksdb database created for
    /// it, and it is saved to local hashmap by ID
    pub async fn join_federation(&self, invite_code: String) -> Result<RpcFederation> {
        let invite_code = invite_code.to_lowercase();
        // FIXME: this is kinda unreliable
        let mut error_code = None;
        match self.join_federation_v2(invite_code.clone()).await {
            Ok(multi) => {
                info!("Joined v2 federation");
                return Ok(multi_federation_to_rpc_federation(&multi).await);
            }
            Err(e) => {
                error!("failed to join v2 federation {e:?}");
                error_code = error_code.or(get_error_code(&e));
            }
        }
        if let Some(error_code) = error_code {
            bail!(error_code);
        }
        bail!("failed to join")
    }

    async fn join_federation_v2(&self, invite_code_string: String) -> Result<Arc<MultiFederation>> {
        // Check if we've already joined this federation
        let invite_code: InviteCodeV2 = InviteCodeV2::from_str(&invite_code_string)?;
        if self
            .get_multi(&invite_code.federation_id().to_string())
            .await
            .is_ok()
        {
            bail!("Already joined this federation")
        }

        let root_mnemonic = self
            .app_state
            .with_read_lock(move |state| Box::pin(async move { state.root_mnemonic.clone() }))
            .await;

        // TODO shaurya actually fetch fee schedule when endpoint available
        let fedi_fee_schedule = FediFeeSchedule::default();

        let db_name = Alphanumeric.sample_string(&mut rand::thread_rng(), 32);
        let federation = FederationV2::join(
            invite_code_string,
            &self.storage,
            self.event_sink.clone(),
            TaskGroup::new(),
            &db_name,
            &root_mnemonic,
            fedi_fee_schedule.clone(),
        )
        .await?;
        let federation_id = federation.federation_id();
        let mut federations = self.federations.lock().await;

        // If the phone dies here, it's still ok because the federation wouldn't
        // exist in the app_state, and we'd reattempt to join it. And the name of the
        // DB file is random so there shouldn't be any collisions.
        self.app_state
            .with_write_lock(move |state| {
                Box::pin(async move {
                    state.joined_federations.insert(
                        federation_id.to_string(),
                        FederationInfo {
                            version: 2,
                            database_name: db_name,
                            fedi_fee_schedule,
                        },
                    );
                    Ok(())
                })
            })
            .await?;
        let multi = Arc::new(MultiFederation::V2(federation));
        federations
            .entry(federation_id.to_string())
            .or_insert_with(|| multi.clone());
        Ok(multi)
    }

    pub async fn federation_preview(&self, invite_code: &str) -> Result<RpcFederationPreview> {
        let invite_code = invite_code.to_lowercase();
        let root_mnemonic = self
            .app_state
            .with_read_lock(move |state| Box::pin(async move { state.root_mnemonic.clone() }))
            .await;
        let (v2,) = futures::join!(FederationV2::download_client_config(
            &invite_code,
            &root_mnemonic
        ));
        match (v2,) {
            (Ok((config, backup_snapshots_result)),) => Ok(RpcFederationPreview {
                id: RpcFederationId(config.global.federation_id().to_string()),
                name: config
                    .global
                    .federation_name()
                    .map(|x| x.to_owned())
                    .unwrap_or(config.global.federation_id().to_string()[0..8].to_string()),
                meta: config.global.meta,
                invite_code: invite_code.to_string(),
                version: 2,
                returning_member_status: match backup_snapshots_result.as_deref() {
                    Ok([]) => RpcReturningMemberStatus::NewMember,
                    Ok([_, ..]) => RpcReturningMemberStatus::ReturningMember,
                    Err(_) => RpcReturningMemberStatus::Unknown,
                },
            }),
            (Err(e),) => anyhow::bail!("failed to connect {e:?}"),
        }
    }

    /// Look up federation by id from in-memory hashmap
    pub async fn get_multi(&self, federation_id: &str) -> Result<Arc<MultiFederation>> {
        let lock = self.federations.lock().await;
        lock.get(federation_id)
            .cloned()
            .ok_or_else(|| anyhow!("Federation not found"))
    }

    pub async fn list_federations(&self) -> Vec<RpcFederation> {
        let lock = self.federations.lock().await;
        join_all(
            lock.clone().into_values().map(|multi| async move {
                multi_federation_to_rpc_federation(&multi.clone()).await
            }),
        )
        .await
    }

    pub async fn leave_federation(&self, federation_id_str: &str) -> Result<()> {
        // delete federation from app state (global DB)
        let federation_id = federation_id_str.to_owned();
        let removed_federation_info = self
            .app_state
            .with_write_lock(move |state| {
                Box::pin(async move { Ok(state.joined_federations.remove(&federation_id)) })
            })
            .await?;

        // If the phone dies here, it's still ok because the federation would be removed
        // from the app_state and in the worst case we'd just be leaving behind a stale
        // DB file.

        // Remove from bridge state
        {
            let mut lock = self.federations.lock().await;
            lock.remove(&federation_id_str.to_string());
        }

        // delete federation db
        if let Some(FederationInfo { database_name, .. }) = removed_federation_info {
            self.storage.delete_federation_db(&database_name).await?;
        }

        Ok(())
    }

    pub async fn guardian_status(
        &self,
        federation_id: RpcFederationId,
    ) -> anyhow::Result<Vec<GuardianStatus>> {
        let multi = self.get_multi(&federation_id.0).await?;
        let status = multi.guardian_status().await?;
        Ok(status)
    }

    pub async fn generate_address(&self, federation_id: RpcFederationId) -> Result<String> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.generate_address().await
    }

    pub async fn generate_invoice(
        &self,
        federation_id: RpcFederationId,
        amount: RpcAmount,
        description: String,
    ) -> Result<RpcInvoice> {
        let multi = self.get_multi(&federation_id.0).await?;
        // FIXME: add this to RPC interface
        let expiry_time = None;
        multi
            .generate_invoice(amount, description, expiry_time)
            .await
    }

    pub async fn pay_invoice(
        &self,
        federation_id: RpcFederationId,
        invoice: &Bolt11Invoice,
    ) -> Result<RpcPayInvoiceResponse> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.pay_invoice(invoice).await
    }

    pub async fn pay_address(
        &self,
        federation_id: RpcFederationId,
        address: Address,
        amount: bitcoin::Amount,
    ) -> Result<RpcPayAddressResponse> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.pay_address(address, amount).await
    }

    pub async fn list_gateways(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<Vec<RpcLightningGateway>> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.list_gateways().await
    }

    pub async fn switch_gateway(
        &self,
        federation_id: RpcFederationId,
        gateway_id: RpcPublicKey,
    ) -> Result<()> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.switch_gateway(&gateway_id.0).await
    }

    pub async fn receive_ecash(
        &self,
        federation_id: RpcFederationId,
        ecash: String,
    ) -> Result<RpcAmount> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.receive_ecash(ecash).await.map(RpcAmount)
    }

    pub async fn validate_ecash(&self, ecash: String) -> Result<RpcEcashInfo> {
        FederationV2::validate_ecash(ecash)
    }

    pub async fn generate_ecash(
        &self,
        federation_id: RpcFederationId,
        amount: RpcAmount,
    ) -> Result<RpcGenerateEcashResponse> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.generate_ecash(amount.0).await
    }

    pub async fn cancel_ecash(&self, federation_id: RpcFederationId, ecash: String) -> Result<()> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.cancel_ecash(ecash).await
    }

    // FIXME: doesn't need result
    async fn get_social_recovery_state(&self) -> anyhow::Result<Option<SocialRecoveryState>> {
        Ok(self
            .app_state
            .with_read_lock(move |state| {
                Box::pin(async move { state.social_recovery_state.clone() })
            })
            .await)
    }

    async fn set_social_recovery_state(
        &self,
        social_recovery_state: Option<SocialRecoveryState>,
    ) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(move |state| {
                Box::pin(async move {
                    state.social_recovery_state = social_recovery_state;
                    Ok(())
                })
            })
            .await
    }

    pub async fn get_mnemonic_words(&self) -> anyhow::Result<Vec<String>> {
        Ok(self
            .app_state
            .with_read_lock(move |state| Box::pin(async move { state.root_mnemonic.clone() }))
            .await
            .word_iter()
            .map(|x| x.to_owned())
            .collect())
    }

    /// Enable logging of potentially sensitive information.
    pub async fn sensitive_log(&self) -> bool {
        self.app_state
            .with_read_lock(|f| Box::pin(async move { f.sensitive_log.unwrap_or(false) }))
            .await
    }

    pub async fn set_sensitive_log(&self, enable: bool) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|f| {
                Box::pin(async move {
                    f.sensitive_log = Some(enable);
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }

    // FIXME: this function has weird name now that it doesn't do any recovery
    pub async fn recover_from_mnemonic(&self, mnemonic: bip39::Mnemonic) -> Result<()> {
        // Only allow recovery when there are no joined federations
        if !self.federations.lock().await.is_empty() {
            bail!("Cannot recover while joined federations exist");
        }

        self.app_state
            .with_write_lock(move |state| {
                Box::pin(async move {
                    state.root_mnemonic = mnemonic;
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }

    pub async fn upload_backup_file(
        &self,
        federation_id: RpcFederationId,
        video_file_path: PathBuf,
    ) -> Result<PathBuf> {
        let multi = self.get_multi(&federation_id.0).await?;
        let storage = self.storage.clone();
        // if remote bridge, copy with adb? maybe storage trait could do this?
        let video_file = storage
            .read_file(&video_file_path)
            .await?
            .ok_or(anyhow!("video file not found"))?;
        let root_mnemonic = self
            .app_state
            .with_read_lock(move |state| Box::pin(async move { state.root_mnemonic.clone() }))
            .await;
        let recovery_file = multi.upload_backup_file(video_file, root_mnemonic).await?;
        storage
            .write_file(RECOVERY_FILENAME.as_ref(), recovery_file)
            .await?;
        Ok(storage.platform_path(RECOVERY_FILENAME.as_ref()))
    }

    pub async fn start_social_recovery_v2(
        &self,
        recovery_file: social::RecoveryFile,
    ) -> anyhow::Result<()> {
        // FIXME: hacks!!!
        let decoders = ModuleDecoderRegistry::from_iter(vec![(
            3,
            fedi_social_client::KIND,
            FediSocialCommonGen::decoder(),
        )]);
        let config = recovery_file
            .client_config
            .clone()
            .redecode_raw(&decoders)?;
        let (social_module_id, social_cfg) = config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");

        let social_api =
            DynGlobalApi::from(WsFederationApi::from_config(&config)).with_module(social_module_id);
        let client = SocialRecoveryClient::new_start(
            social_module_id,
            social_cfg.clone(),
            social_api,
            recovery_file.clone(),
        )?;

        // request social recovery verification with the federation
        let verification_request =
            client.create_verification_request(recovery_file.verification_document.clone())?;
        client
            .upload_verification_request(&verification_request)
            .await
            .context("upload verification request")?;

        self.set_social_recovery_state(Some(client.state().clone()))
            .await?;
        Ok(())
    }

    pub async fn recovery_qr(&self) -> anyhow::Result<Option<SocialRecoveryQr>> {
        if let Some(state) = self.get_social_recovery_state().await? {
            Ok(Some(SocialRecoveryQr {
                recovery_id: RpcRecoveryId(state.recovery_id()),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn cancel_social_recovery(&self) -> anyhow::Result<()> {
        self.set_social_recovery_state(None).await?;
        Ok(())
    }

    // TODO: rename this to start_social_recovery
    pub async fn validate_recovery_file(&self, recovery_file_path: PathBuf) -> Result<()> {
        // Only allow recovery when there are no joined federations
        if !self.federations.lock().await.is_empty() {
            bail!("Cannot recover while joined federations exist");
        }

        // These 2 lines validate
        let recovery_file_bytes = self
            .storage
            .read_file(&recovery_file_path)
            .await?
            .ok_or(anyhow!("recovery file not found"))?;
        let recovery_file = social::RecoveryFile::from_bytes(&recovery_file_bytes)
            .context(ErrorCode::InvalidSocialRecoveryFile)?;

        // this starts a social recovery "session" ... what this means is kinda
        // handwavvy
        self.start_social_recovery_v2(recovery_file).await?;
        Ok(())
    }

    pub async fn complete_social_recovery(&self) -> Result<RpcFederation> {
        let recovery_client = self.social_recovery_client_continue().await?;
        let seed_phrase = recovery_client.combine_recovered_user_phrase()?;
        let root_mnemonic = bip39::Mnemonic::parse(seed_phrase.0)?;
        self.recover_from_mnemonic(root_mnemonic).await?;
        self.set_social_recovery_state(None).await?;
        tracing::info!("social recovery complete");
        tracing::info!("auto joining federation");
        let decoders = ModuleDecoderRegistry::from_iter(vec![(
            3,
            fedi_social_client::KIND,
            FediSocialCommonGen::decoder(),
        )]);
        self.join_federation(
            federation_v2::invite_code_from_client_confing(&ClientConfig::consensus_decode_hex(
                &recovery_client.state().client_config,
                &decoders,
            )?)
            .to_string(),
        )
        .await
    }

    async fn social_recovery_client_continue(&self) -> anyhow::Result<SocialRecoveryClient> {
        let social_state = self
            .get_social_recovery_state()
            .await?
            .context(ErrorCode::BadRequest)?;
        let decoders = ModuleDecoderRegistry::from_iter(vec![(
            3,
            fedi_social_client::KIND,
            FediSocialCommonGen::decoder(),
        )]);
        let config = ClientConfig::consensus_decode_hex(&social_state.client_config, &decoders)?;
        let (social_module_id, social_cfg) = config
            .get_first_module_by_kind::<fedi_social_client::config::FediSocialClientConfig>(
                "fedi-social",
            )
            .expect("needs social recovery module client config");
        let social_api =
            DynGlobalApi::from(WsFederationApi::from_config(&config)).with_module(social_module_id);
        let recovery_client = SocialRecoveryClient::new_continue(
            social_module_id,
            social_cfg.clone(),
            social_api,
            social_state.clone(),
        );
        Ok(recovery_client)
    }

    pub async fn social_recovery_approvals(&self) -> Result<SocialRecoveryEvent> {
        let mut recovery_client = self.social_recovery_client_continue().await?;

        let client_config = ClientConfig::consensus_decode_hex(
            &recovery_client.state().client_config,
            &ModuleDecoderRegistry::from_iter(vec![]),
        )?;
        let guardian_peer_ids: Vec<(String, PeerId)> = client_config
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
        self.set_social_recovery_state(Some(recovery_client.state().clone()))
            .await?;
        let result = SocialRecoveryEvent {
            approvals,
            remaining,
        };
        Ok(result)
    }

    pub async fn download_verification_doc(
        &self,
        federation_id: RpcFederationId,
        recovery_id: RpcRecoveryId,
    ) -> Result<Option<PathBuf>> {
        let multi = self.get_multi(&federation_id.0).await?;
        let verification_doc = multi.download_verification_doc(recovery_id.0).await?;
        if let Some(verification_doc) = verification_doc {
            self.storage
                .write_file(VERIFICATION_FILENAME.as_ref(), verification_doc)
                .await?;
            tracing::info!("saved verificaiton doc");
            Ok(Some(
                self.storage.platform_path(VERIFICATION_FILENAME.as_ref()),
            ))
        } else {
            Ok(None)
        }
    }

    pub async fn approve_social_recovery_request(
        &self,
        federation_id: RpcFederationId,
        recovery_id: RpcRecoveryId,
        peer_id: RpcPeerId,
        password: String,
    ) -> Result<()> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi
            .approve_social_recovery_request(&recovery_id.0, peer_id.0, &password)
            .await
    }

    pub async fn list_transactions(
        &self,
        federation_id: RpcFederationId,
        start_time: Option<u32>,
        limit: Option<u32>,
    ) -> Result<Vec<RpcTransaction>> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.list_transactions(start_time, limit).await
    }

    pub async fn update_transaction_notes(
        &self,
        federation_id: RpcFederationId,
        transaction_id: String,
        notes: String,
    ) -> anyhow::Result<()> {
        self.get_multi(&federation_id.0)
            .await?
            .update_transaction_notes(transaction_id, notes)
            .await
    }

    pub async fn sign_lnurl_message(
        &self,
        federation_id: RpcFederationId,
        message: Message,
        domain: String,
    ) -> Result<RpcSignedLnurlMessage> {
        let multi = self.get_multi(&federation_id.0).await?;
        let global_root_secret = self
            .app_state
            .with_read_lock(move |state| {
                Box::pin(async move {
                    Bip39RootSecretStrategy::<12>::to_root_secret(&state.root_mnemonic)
                })
            })
            .await;
        Ok(multi
            .sign_lnurl_message(&message, domain, global_root_secret)
            .await)
    }

    pub async fn xmpp_credentials(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<RpcXmppCredentials> {
        let multi = self.get_multi(&federation_id.0).await?;
        Ok(multi.get_xmpp_credentials().await)
    }

    pub async fn backup_xmpp_username(
        &self,
        federation_id: RpcFederationId,
        username: String,
    ) -> Result<()> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.save_xmpp_username(&username).await;
        multi.backup().await
    }

    pub async fn get_nostr_pub_key(&self, federation_id: RpcFederationId) -> Result<String> {
        let multi = self.get_multi(&federation_id.0).await?;
        let global_root_secret = self
            .app_state
            .with_read_lock(move |state| {
                Box::pin(async move {
                    Bip39RootSecretStrategy::<12>::to_root_secret(&state.root_mnemonic)
                })
            })
            .await;
        multi
            .get_nostr_pub_key(global_root_secret)
            .await
            .map(|pubkey| pubkey.to_string())
    }

    pub async fn sign_nostr_event(
        &self,
        federation_id: RpcFederationId,
        event_hash: String,
    ) -> Result<String> {
        let multi = self.get_multi(&federation_id.0).await?;
        let global_root_secret = self
            .app_state
            .with_read_lock(move |state| {
                Box::pin(async move {
                    Bip39RootSecretStrategy::<12>::to_root_secret(&state.root_mnemonic)
                })
            })
            .await;
        multi.sign_nostr_event(event_hash, global_root_secret).await
    }

    pub async fn stability_pool_account_info(
        &self,
        federation_id: RpcFederationId,
        force_update: bool,
    ) -> Result<RpcStabilityPoolAccountInfo> {
        self.get_multi(&federation_id.0)
            .await?
            .stability_pool_account_info(force_update)
            .await
            .map(|info| info.into())
    }

    pub async fn stability_pool_deposit_to_seek(
        &self,
        federation_id: RpcFederationId,
        amount: RpcAmount,
    ) -> Result<RpcOperationId> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi
            .stability_pool_deposit_to_seek(amount.0)
            .await
            .map(Into::into)
    }

    pub async fn stability_pool_withdraw(
        &self,
        federation_id: RpcFederationId,
        unlocked_amount: RpcAmount,
        locked_bps: u32,
    ) -> Result<RpcOperationId> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi
            .stability_pool_withdraw(unlocked_amount.0, locked_bps)
            .await
            .map(Into::into)
    }

    pub(crate) async fn stability_pool_next_cycle_start_time(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<u64> {
        self.get_multi(&federation_id.0)
            .await?
            .stability_pool_next_cycle_start_time()
            .await
    }
    pub(crate) async fn stability_pool_cycle_start_price(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<u64> {
        self.get_multi(&federation_id.0)
            .await?
            .stability_pool_cycle_start_price()
            .await
    }
}

/// Static helper method. For the given AppState and federation ID, reads the
/// AppState to retrieve the fedi fee schedule and returns it. If the federation
/// is unknown, returns an error.
async fn get_federation_fedi_fee_schedule(
    app_state: &AppState,
    federation_id_str: String,
) -> anyhow::Result<FediFeeSchedule> {
    app_state
        .with_read_lock(move |state| {
            Box::pin(async move {
                state
                    .joined_federations
                    .get(&federation_id_str)
                    .ok_or(anyhow!("Unknown federation"))
                    .map(|fed_info| fed_info.fedi_fee_schedule.clone())
            })
        })
        .await
}
