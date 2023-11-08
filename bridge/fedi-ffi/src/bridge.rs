use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;
use std::sync::Arc;
use std::time::UNIX_EPOCH;
use std::usize;

use anyhow::{anyhow, bail, Context, Result};
use bitcoin::secp256k1::{Message, PublicKey};
use bitcoin::{Address, XOnlyPublicKey};
use fedi_social_client::RecoveryId;
use fedimint_client::db::ChronologicalOperationLogKey;
use fedimint_client::sm::OperationId;
use fedimint_core::api::InviteCode;
use fedimint_core::config::FederationId;
use fedimint_core::task::TaskGroup;
use fedimint_core::{Amount, PeerId};
use fedimint_core_v0::api::WsClientConnectInfo as InviteCodeV0;
use fedimint_core_v0::task::TaskGroup as TaskGroupV0;
use fedimint_mint_client::MintClientExt;
use fedimint_mint_client_v0::{parse_ecash, MintClientExt as MintClientExtV0};
use futures::future::join_all;
use futures::StreamExt;
use lightning_invoice::Invoice;
use rand::distributions::{Alphanumeric, DistString};
use stability_pool_client::common::AccountInfo;
use tokio::sync::Mutex;
use tracing::{error, info};
use v0_rocksdb::{
    JoinedFederationV0, JoinedFederationV1, JoinedFederationsV0Prefix, JoinedFederationsV1Prefix,
};

use super::event::{EventSink, SocialRecoveryEvent};
use super::federation_v0::FederationV0;
use super::federation_v1::social::RecoveryFile;
use super::federation_v1::FederationV1;
use super::storage::Storage;
use super::translate::Translate;
use super::types::{
    multi_federation_to_rpc_federation, RpcAmount, RpcFederation, RpcFederationId, RpcInvoice,
    RpcLightningGateway, RpcOperationId, RpcPayInvoiceResponse, RpcPeerId, RpcPublicKey,
    RpcRecoveryId, RpcSignedLnurlMessage, RpcStabilityPoolAccountInfo, RpcTransaction,
    RpcXmppCredentials, SocialRecoveryApproval, SocialRecoveryQr,
};
use crate::error::ErrorCode;
use crate::types::{RpcBalanceInfo, RpcEcashInfo, RpcGenerateEcashResponse, RpcPayAddressResponse};

// FIXME: federation-specific filename
pub const RECOVERY_FILENAME: &str = "backup.fedi";
pub const VERIFICATION_FILENAME: &str = "verification.mp4";

pub enum MultiFederation {
    V0(FederationV0),
    V1(FederationV1),
}

impl MultiFederation {
    pub fn federation_id(&self) -> FederationId {
        match self {
            Self::V0(multi) => multi.federation_id().translate(),
            Self::V1(multi) => multi.federation_id(),
        }
    }

    pub async fn generate_address(&self) -> Result<String> {
        match self {
            Self::V0(_) => {
                bail!("Not supported for this version")
            }
            Self::V1(multi) => multi.generate_address().await,
        }
    }

    pub async fn generate_invoice(
        &self,
        amount: RpcAmount,
        description: String,
        expiry_time: Option<u64>,
    ) -> Result<RpcInvoice> {
        match self {
            Self::V0(multi) => {
                multi
                    .generate_invoice(amount, description, expiry_time)
                    .await
            }
            Self::V1(multi) => {
                multi
                    .generate_invoice(amount, description, expiry_time)
                    .await
            }
        }
    }

    pub async fn pay_invoice(&self, invoice: &Invoice) -> Result<RpcPayInvoiceResponse> {
        match self {
            Self::V0(v0) => v0.pay_invoice(invoice).await,
            Self::V1(v1) => v1.pay_invoice(invoice).await,
        }
    }

    pub async fn pay_address(
        &self,
        address: Address,
        amount: bitcoin::Amount,
    ) -> Result<RpcPayAddressResponse> {
        info!("pay address amount is {}", amount);
        match self {
            Self::V0(_) => bail!("Unsupported for this version"),
            Self::V1(v1) => v1.pay_address(address, amount).await,
        }
    }

    pub async fn list_gateways(&self) -> Result<Vec<RpcLightningGateway>> {
        match self {
            Self::V0(v0) => v0
                .list_gateways()
                .await
                .map(|gws| gws.into_iter().map(RpcLightningGateway::V0).collect()),
            Self::V1(v1) => v1
                .list_gateways()
                .await
                .map(|gws| gws.into_iter().map(RpcLightningGateway::V1).collect()),
        }
    }

    pub async fn switch_gateway(&self, gateway_id: &PublicKey) -> Result<()> {
        match self {
            Self::V0(v0) => v0.switch_gateway(gateway_id).await,
            Self::V1(v1) => v1.switch_gateway(gateway_id).await,
        }
    }

    pub async fn get_balance(&self) -> Amount {
        match self {
            Self::V0(v0) => v0.get_balance().await.translate(),
            Self::V1(v1) => v1.get_balance().await,
        }
    }

    pub async fn balance_info(&self) -> RpcBalanceInfo {
        match self {
            Self::V0(v0) => v0.balance_info().await,
            Self::V1(v1) => v1.balance_info().await,
        }
    }

    pub async fn receive_ecash(&self, ecash: String) -> Result<Amount> {
        match self {
            Self::V0(v0) => v0.receive_ecash(ecash).await.translate(),
            Self::V1(v1) => v1.receive_ecash(ecash).await,
        }
    }

    pub async fn generate_ecash(&self, amount: Amount) -> Result<RpcGenerateEcashResponse> {
        match self {
            Self::V0(v0) => v0.generate_ecash(amount.translate()).await,
            Self::V1(v1) => v1.generate_ecash(amount).await,
        }
    }

    pub async fn cancel_ecash(&self, ecash: String) -> Result<()> {
        match self {
            Self::V0(v0) => {
                let ecash = parse_ecash(&ecash).context(ErrorCode::BadRequest)?;
                v0.cancel_ecash(ecash).await
            }
            Self::V1(v1) => {
                v1.cancel_ecash(ecash.parse().context(ErrorCode::BadRequest)?)
                    .await
            }
        }
    }
    pub async fn get_mnemonic_words(&self) -> Vec<String> {
        match self {
            Self::V0(v0) => v0.get_mnemonic_words().await,
            Self::V1(v1) => v1.get_mnemonic_words().await,
        }
    }

    pub async fn backup(&self) -> Result<()> {
        match self {
            Self::V0(v0) => v0.backup().await,
            Self::V1(v1) => v1.backup().await,
        }
    }

    pub async fn get_xmpp_username(&self) -> Option<String> {
        match self {
            Self::V0(v0) => v0.get_xmpp_username().await,
            Self::V1(v1) => v1.get_xmpp_username().await,
        }
    }

    pub async fn save_xmpp_username(&self, username: &String) {
        match self {
            Self::V0(v0) => v0.save_xmpp_username(username).await,
            Self::V1(v1) => v1.save_xmpp_username(username).await,
        }
    }

    pub async fn await_restore_finished(&self) -> Result<()> {
        match self {
            Self::V0(v0) => v0.client.await_restore_finished().await,
            Self::V1(v1) => v1.client.await_restore_finished().await,
        }
    }

    pub async fn upload_backup_file(&self, video_file: Vec<u8>) -> Result<Vec<u8>> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.upload_backup_file(video_file).await,
        }
    }

    pub async fn start_social_recovery(&self, recovery_file: &RecoveryFile) -> Result<()> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.start_social_recovery(recovery_file).await,
        }
    }

    pub async fn social_recovery_qr(&self) -> Result<SocialRecoveryQr> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.social_recovery_qr().await,
        }
    }

    pub async fn download_verification_doc(
        &self,
        recovery_id: RecoveryId,
    ) -> Result<Option<Vec<u8>>> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.download_verification_doc(&recovery_id).await,
        }
    }

    pub async fn approve_social_recovery_request(
        &self,
        recovery_id: &RecoveryId,
        peer_id: PeerId,
        password: &str,
    ) -> Result<()> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => {
                v1.approve_social_recovery_request(recovery_id, peer_id, password)
                    .await
            }
        }
    }

    pub async fn social_recovery_approvals(&self) -> Result<(Vec<SocialRecoveryApproval>, usize)> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.social_recovery_approvals().await,
        }
    }

    pub async fn social_recovery_combine_shares(&self) -> Result<bip39::Mnemonic> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => v1.social_recovery_combine_shares().await,
        }
    }

    pub async fn delete_social_recovery_state_and_id(&self) -> Result<()> {
        match self {
            Self::V0(_) => bail!(ErrorCode::SocialRecoveryNotSupported),
            Self::V1(v1) => {
                v1.delete_social_recovery_state_and_id().await;
                Ok(())
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

        let start_after = time.map(|t| ChronologicalOperationLogKey {
            creation_time: t,
            operation_id,
        });

        let usize_limit = limit.map_or(usize::MAX as u32, |l| l) as usize;

        Ok(match self {
            Self::V0(v0) => v0.list_transactions(usize::MAX).await,
            Self::V1(v1) => v1.list_transactions(usize_limit, start_after).await,
        })
    }

    pub async fn update_transaction_notes(
        &self,
        transaction_id: String,
        notes: String,
    ) -> anyhow::Result<()> {
        match self {
            Self::V0(v0) => {
                v0.update_transaction_notes(transaction_id.parse()?, notes)
                    .await
            }
            Self::V1(v1) => {
                v1.update_transaction_notes(transaction_id.parse()?, notes)
                    .await
            }
        };
        Ok(())
    }

    pub async fn sign_lnurl_message(&self, message: &Message) -> RpcSignedLnurlMessage {
        match self {
            Self::V0(v0) => v0.sign_lnurl_message(message).await,
            Self::V1(v1) => v1.sign_lnurl_message(message).await,
        }
    }

    pub async fn get_xmpp_credentials(&self) -> RpcXmppCredentials {
        match self {
            Self::V0(v0) => v0.get_xmpp_credentials().await,
            Self::V1(v1) => v1.get_xmpp_credentials().await,
        }
    }

    pub async fn get_nostr_pub_key(&self) -> Result<XOnlyPublicKey> {
        match self {
            Self::V0(_) => bail!(ErrorCode::NostrNotSupported),
            Self::V1(v1) => Ok(v1.get_nostr_pub_key().await),
        }
    }

    pub async fn sign_nostr_event(&self, event_hash: String) -> Result<String> {
        match self {
            Self::V0(_) => bail!(ErrorCode::NostrNotSupported),
            Self::V1(v1) => v1.sign_nostr_event(event_hash).await,
        }
    }

    pub async fn stability_pool_account_info(&self) -> Result<AccountInfo> {
        match self {
            Self::V0(_) => bail!(ErrorCode::StabilityPoolNotSupported),
            Self::V1(v1) => v1.stability_pool_account_info().await,
        }
    }

    pub async fn stability_pool_deposit_to_seek(
        &self,
        amount: Amount,
    ) -> Result<fedimint_client::sm::OperationId> {
        match self {
            MultiFederation::V0(_) => bail!(ErrorCode::StabilityPoolNotSupported),
            MultiFederation::V1(v1) => v1.stability_pool_deposit_to_seek(amount).await,
        }
    }

    pub async fn stability_pool_withdraw(
        &self,
        unlocked_amount: Amount,
        locked_bps: u32,
    ) -> Result<fedimint_client::sm::OperationId> {
        match self {
            MultiFederation::V0(_) => bail!(ErrorCode::StabilityPoolNotSupported),
            MultiFederation::V1(v1) => {
                v1.stability_pool_withdraw(unlocked_amount, locked_bps)
                    .await
            }
        }
    }
}

/// This is instantiated once as a global. When RPC commands come in, this
/// struct is used as a router to look up the federation and handle the RPC
/// command using it.
pub struct Bridge {
    pub storage: Storage,
    pub federations: Arc<Mutex<HashMap<FederationId, Arc<MultiFederation>>>>,
    pub event_sink: EventSink,
    pub task_group_v0: TaskGroupV0,
    pub task_group: TaskGroup,
}

impl Bridge {
    pub async fn new(storage: Storage, event_sink: EventSink) -> Result<Self> {
        let task_group = TaskGroup::new();
        let task_group_v0 = TaskGroupV0::new();
        // load v0 federations
        let db = storage.global_database_v0().await?;
        let mut dbtx = db.begin_transaction().await;
        let v0_joined = dbtx
            .find_by_prefix(&JoinedFederationsV0Prefix)
            .await
            .collect::<Vec<_>>()
            .await;
        let v0_iter = v0_joined.iter().map(|(federation_id, _)| async {
            Ok::<(FederationId, Arc<MultiFederation>), anyhow::Error>((
                federation_id.0.translate(),
                Arc::new(MultiFederation::V0(
                    FederationV0::from_db(
                        storage.federation_idb_v0(&federation_id.0).await?,
                        event_sink.clone(),
                        task_group_v0.make_subgroup().await,
                    )
                    .await?,
                )),
            ))
        });
        let v0_pairs = futures::future::try_join_all(v0_iter).await?;
        let mut v0_map = HashMap::from_iter(v0_pairs);

        // load v1 federations
        let v1_joined = dbtx
            .find_by_prefix(&JoinedFederationsV1Prefix)
            .await
            .collect::<Vec<_>>()
            .await;
        let v1_iter = v1_joined.iter().map(|(federation_id, db_name)| async {
            Ok::<(FederationId, Arc<MultiFederation>), anyhow::Error>((
                federation_id.0.translate(),
                Arc::new(MultiFederation::V1(
                    FederationV1::from_db(
                        storage.federation_idb(&db_name.clone()).await?,
                        event_sink.clone(),
                        task_group.make_subgroup().await,
                    )
                    .await?,
                )),
            ))
        });
        let v1_pairs = futures::future::try_join_all(v1_iter).await?;
        let v1_map: HashMap<FederationId, Arc<MultiFederation>> = HashMap::from_iter(v1_pairs);

        // combine v0 and v1 hashmaps
        v0_map.extend(v1_map);
        Ok(Self {
            storage,
            federations: Arc::new(Mutex::new(v0_map)),
            event_sink,
            task_group_v0,
            task_group,
        })
    }

    /// Joins federation from invite code
    ///
    /// Federation ID saved to global database, new rocksdb database created for
    /// it, and it is saved to local hashmap by ID
    pub async fn join_federation(&self, invite_code: String) -> Result<RpcFederation> {
        // FIXME: this is kinda unreliable
        match self.join_federation_v1(invite_code.clone()).await {
            Ok(multi) => {
                info!("Joined v1 federation");
                return Ok(multi_federation_to_rpc_federation(&multi).await);
            }
            Err(e) => {
                error!("failed to join v1 federation {e:?}");
            }
        }
        match self.join_federation_v0(invite_code.clone()).await {
            Ok(multi) => {
                info!("Joined v0 federation");
                return Ok(multi_federation_to_rpc_federation(&multi).await);
            }
            Err(e) => {
                error!("failed to join v0 federation {e:?}");
            }
        }
        bail!("failed to join")
    }

    async fn join_federation_v1(&self, invite_code_string: String) -> Result<Arc<MultiFederation>> {
        // Check if we've already joined this federation
        let invite_code: InviteCode = InviteCode::from_str(&invite_code_string)?;
        if self.get_multi(&invite_code.id).await.is_ok() {
            bail!("Already joined this federation")
        }

        // we generate a random string for the rocksdb directory name
        let db_name = Alphanumeric.sample_string(&mut rand::thread_rng(), 32);
        let federation = FederationV1::join(
            invite_code_string,
            &self.storage,
            self.event_sink.clone(),
            fedimint_core::task::TaskGroup::new(),
            &db_name,
        )
        .await?;
        let federation_id = federation.federation_id();
        let mut federations = self.federations.lock().await;
        let global_db = self.storage.global_database_v0().await?;
        let mut dbtx = global_db.begin_transaction().await;
        dbtx.insert_entry(&JoinedFederationV1(federation_id.translate()), &db_name)
            .await;
        dbtx.commit_tx().await;
        let multi = Arc::new(MultiFederation::V1(federation));
        federations
            .entry(federation_id)
            .or_insert_with(|| multi.clone());
        Ok(multi)
    }

    async fn join_federation_v0(&self, invite_code_string: String) -> Result<Arc<MultiFederation>> {
        // Check if we've already joined this federation
        let invite_code: InviteCodeV0 = InviteCodeV0::from_str(&invite_code_string)?;
        if self.get_multi(&invite_code.id.translate()).await.is_ok() {
            bail!("Already joined this federation")
        }

        let federation = FederationV0::join(
            invite_code_string,
            &self.storage,
            self.event_sink.clone(),
            fedimint_core_v0::task::TaskGroup::new(),
        )
        .await?;
        let federation_id = federation.federation_id();
        let mut federations = self.federations.lock().await;
        let global_db = self.storage.global_database_v0().await?;
        let mut dbtx = global_db.begin_transaction().await;
        dbtx.insert_entry(&JoinedFederationV0(federation_id), &())
            .await;
        dbtx.commit_tx().await;
        let multi = Arc::new(MultiFederation::V0(federation));
        federations
            .entry(federation_id.translate())
            .or_insert_with(|| multi.clone());
        Ok(multi)
    }

    /// Look up federation by id from in-memory hashmap
    pub async fn get_multi(&self, federation_id: &FederationId) -> Result<Arc<MultiFederation>> {
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

    pub async fn leave_federation(&self, federation_id: &FederationId) -> Result<()> {
        // delete federation from global db
        let global_db = self.storage.global_database_v0().await?;
        let mut dbtx = global_db.begin_transaction().await;
        dbtx.remove_entry(&JoinedFederationV0(federation_id.translate()))
            .await;
        let db_name = dbtx
            .remove_entry(&JoinedFederationV1(federation_id.translate()))
            .await;

        // Remove from bridge state
        {
            let mut lock = self.federations.lock().await;
            lock.remove(federation_id);
        }

        // delete federation db
        if let Some(db_name) = db_name {
            self.storage.delete_federation_db(&db_name).await?;
        } else {
            self.storage
                .delete_federation_db(&federation_id.to_string())
                .await?;
        }

        dbtx.commit_tx().await;
        Ok(())
    }

    pub async fn balance_info(
        &self,
        federation_id: RpcFederationId,
    ) -> anyhow::Result<RpcBalanceInfo> {
        Ok(self.get_multi(&federation_id.0).await?.balance_info().await)
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
        invoice: &Invoice,
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
        // Attempt v1 deserialization
        if let Ok(info) = FederationV1::validate_ecash(ecash.clone()) {
            return Ok(info);
        }
        // Attempt v0 deserialization
        FederationV0::validate_ecash(ecash)
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

    pub async fn get_mnemonic_words(&self, federation_id: RpcFederationId) -> Result<Vec<String>> {
        let multi = self.get_multi(&federation_id.0).await?;
        Ok(multi.get_mnemonic_words().await)
    }

    pub async fn recover_from_mnemonic(
        &self,
        federation_id: RpcFederationId,
        mnemonic: Vec<String>,
    ) -> Result<Option<String>> {
        // Check if we can recover this federation
        let old_multi = self.get_multi(&federation_id.0).await?;
        if old_multi.get_balance().await > fedimint_core::Amount::from_sats(100) {
            bail!("Cannot restore from backup if current balance exceeds 100 sats")
        }

        // Recover the federation
        let mnemonic: bip39::Mnemonic = mnemonic.join(" ").parse()?;
        let new_multi = match &*old_multi {
            MultiFederation::V0(v0) => {
                let old_client = v0.prepare_for_recovery().await?;
                drop(old_multi); // Release rocksdb
                MultiFederation::V0(
                    FederationV0::from_mnemonic(
                        mnemonic,
                        old_client,
                        self.event_sink.clone(),
                        self.task_group_v0.make_subgroup().await,
                    )
                    .await?,
                )
            }
            MultiFederation::V1(v1) => {
                let old_client = v1.prepare_for_recovery().await?;
                drop(old_multi); // Release rocksdb
                MultiFederation::V1(
                    FederationV1::from_mnemonic(
                        mnemonic,
                        old_client,
                        self.event_sink.clone(),
                        self.task_group.make_subgroup().await,
                    )
                    .await?,
                )
            }
        };
        let new_multi = Arc::new(new_multi);
        let mut federations = self.federations.lock().await;
        federations.insert(federation_id.0, new_multi.clone());

        // Wait for recovery to finish
        new_multi.await_restore_finished().await?;

        // Return recovered username
        // TODO: should probably return FediBackupMetadata instead
        let username = new_multi.get_xmpp_username().await;
        Ok(username)
    }

    pub async fn upload_backup_file(
        &self,
        federation_id: RpcFederationId,
        video_file_path: PathBuf,
    ) -> Result<PathBuf> {
        let multi = self.get_multi(&federation_id.0).await?;
        let storage = self.storage.clone();
        let video_file = storage.read_file(&video_file_path).await?;
        let recovery_file = multi.upload_backup_file(video_file).await?;
        storage
            .write_file(RECOVERY_FILENAME.as_ref(), recovery_file)
            .await?;
        Ok(storage.platform_path(RECOVERY_FILENAME.as_ref()))
    }

    pub async fn validate_recovery_file(
        &self,
        federation_id: RpcFederationId,
        recovery_file_path: PathBuf,
    ) -> Result<bool> {
        let multi = self.get_multi(&federation_id.0).await?;
        let recovery_file_bytes = self.storage.read_file(&recovery_file_path).await?;
        let recovery_file = RecoveryFile::from_bytes(&recovery_file_bytes)?;
        multi.start_social_recovery(&recovery_file).await?;
        let valid = RecoveryFile::from_bytes(&recovery_file_bytes).is_ok();
        Ok(valid)
    }

    pub async fn recovery_qr(&self, federation_id: RpcFederationId) -> Result<SocialRecoveryQr> {
        let multi = self.get_multi(&federation_id.0).await?;
        // Get the recovery file from disk (React Native and handle_upload_backup_file
        // put it there)
        let recovery_file_bytes = self.storage.read_file(RECOVERY_FILENAME.as_ref()).await?;
        let recovery_file = RecoveryFile::from_bytes(&recovery_file_bytes)?;
        // Upload verification document if none exists.
        multi.start_social_recovery(&recovery_file).await?;
        multi.social_recovery_qr().await
    }

    pub async fn social_recovery_approvals(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<SocialRecoveryEvent> {
        let multi = self.get_multi(&federation_id.0).await?;
        let (approvals, remaining) = multi.social_recovery_approvals().await?;
        let result = SocialRecoveryEvent {
            federation_id,
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

    pub async fn complete_social_recovery(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<Option<String>> {
        let multi = self.get_multi(&federation_id.0).await?;
        let mnemonic = multi
            .social_recovery_combine_shares()
            .await?
            .word_iter()
            .map(|s| s.to_string())
            .collect();
        let username = self.recover_from_mnemonic(federation_id, mnemonic).await?;
        multi.delete_social_recovery_state_and_id().await?;
        Ok(username)
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
    ) -> Result<RpcSignedLnurlMessage> {
        let multi = self.get_multi(&federation_id.0).await?;
        Ok(multi.sign_lnurl_message(&message).await)
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
        multi
            .get_nostr_pub_key()
            .await
            .map(|pubkey| pubkey.to_string())
    }

    pub async fn sign_nostr_event(
        &self,
        federation_id: RpcFederationId,
        event_hash: String,
    ) -> Result<String> {
        let multi = self.get_multi(&federation_id.0).await?;
        multi.sign_nostr_event(event_hash).await
    }

    pub async fn stability_pool_account_info(
        &self,
        federation_id: RpcFederationId,
    ) -> Result<RpcStabilityPoolAccountInfo> {
        self.get_multi(&federation_id.0)
            .await?
            .stability_pool_account_info()
            .await
            .map(|info| info.into())
    }

    pub async fn stability_pool_deposit_to_seek(
        &self,
        federation_id: RpcFederationId,
        amount: RpcAmount,
    ) -> Result<RpcOperationId> {
        self.get_multi(&federation_id.0)
            .await?
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
        self.get_multi(&federation_id.0)
            .await?
            .stability_pool_withdraw(unlocked_amount.0, locked_bps)
            .await
            .map(Into::into)
    }
}
