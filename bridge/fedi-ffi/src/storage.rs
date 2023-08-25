use anyhow::Result;
use fedi_social_client::RecoveryId;
use fedimint_core::config::FederationId;
use fedimint_core::db::IDatabase;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;
use tokio::sync::Mutex;
use tracing::debug;

use crate::constants::FEDI_FILE_PATH;
use crate::types::MultiClientConfig;

use super::federation_v1::social::SocialRecoveryState;
use super::types::RpcFederationId;

#[apply(async_trait_maybe_send!)]
pub trait IStorage: 'static + MaybeSend + MaybeSync {
    /// Database to store all federation joined
    async fn global_database_v0(&self) -> anyhow::Result<fedimint_core_v0::db::Database>;
    // Dpc proposed alternative: open_federation_db(federation_id) which just tries each version in descending order
    async fn federation_idb(&self, id: &FederationId) -> anyhow::Result<Box<dyn IDatabase>>;
    /// FIXME: can I get rid of this?
    async fn federation_database_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<fedimint_core_v0::db::Database>;
    async fn federation_idb_v0(
        &self,
        id: &fedimint_core_v0::config::FederationId,
    ) -> anyhow::Result<Box<dyn fedimint_core_v0::db::IDatabase>>;
    async fn delete_federation_db(&self, id: &FederationId) -> anyhow::Result<()>;
    async fn read_file(&self, path: &Path) -> anyhow::Result<Vec<u8>>;
    async fn write_file(&self, path: &Path, data: Vec<u8>) -> anyhow::Result<()>;
    /// convert a relative path to a path understood by the platform.
    fn platform_path(&self, path: &Path) -> PathBuf;
}

pub type Storage = Arc<dyn IStorage>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FederationInfo {
    pub xmpp_username: Option<String>,
    pub invite_code: Option<String>,
    pub last_backup_timestamp: Option<SystemTime>,
    pub social_recovery_state: Option<SocialRecoveryState>,
    pub social_recovery_id: Option<RecoveryId>,
    pub client_config: MultiClientConfig,
}

impl FederationInfo {
    fn new(invite_code: String, client_config: MultiClientConfig) -> Self {
        Self {
            invite_code: Some(invite_code),
            client_config,
            xmpp_username: None,
            last_backup_timestamp: None,
            social_recovery_state: None,
            social_recovery_id: None,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct FediInfo {
    pub federations: HashMap<RpcFederationId, FederationInfo>,
}

pub struct FediFile {
    pub info: Arc<Mutex<FediInfo>>,
    pub storage: Storage,
}

// FIXME: unwraps everywhere
impl FediFile {
    pub async fn read(storage: Storage) -> Result<Self> {
        let fedi_info = storage
            .read_file(&Path::new(FEDI_FILE_PATH))
            .await
            .map(|contents| serde_json::from_slice(&contents))??;
        Ok(Self {
            info: Arc::new(Mutex::new(fedi_info)),
            storage,
        })
    }

    pub async fn save(&self) -> Result<()> {
        let info = self.info.lock().await;
        self.storage
            .write_file(&Path::new(FEDI_FILE_PATH), serde_json::to_vec(&*info)?)
            .await?;
        debug!("Wrote fedi file {info:?}");
        Ok(())
    }

    pub async fn join_federation(
        &self,
        federation_id: FederationId,
        invite_code: String,
        client_config: MultiClientConfig,
    ) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let federation_info = FederationInfo::new(invite_code, client_config);
            info.federations
                .insert(RpcFederationId(federation_id), federation_info);
        }
        self.save().await
    }

    pub async fn leave_federation(&self, federation_id: FederationId) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            info.federations.remove(&RpcFederationId(federation_id));
        }
        self.save().await
    }

    pub async fn get_federation_info(&self, federation_id: FederationId) -> Option<FederationInfo> {
        let info = self.info.lock().await;
        info.federations
            .get(&RpcFederationId(federation_id))
            .cloned()
    }

    pub async fn get_xmpp_username(&self, federation_id: FederationId) -> Option<String> {
        let fed = self.get_federation_info(federation_id).await.unwrap();
        fed.xmpp_username.clone()
    }

    pub async fn save_xmpp_username(
        &self,
        federation_id: FederationId,
        username: &String,
    ) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let fed = info
                .federations
                .get_mut(&RpcFederationId(federation_id))
                .unwrap();
            fed.xmpp_username = Some(username.clone());
        }
        self.save().await
    }

    pub async fn get_invite_code(&self, federation_id: FederationId) -> Option<String> {
        let fed = self.get_federation_info(federation_id).await.unwrap();
        fed.invite_code.clone()
    }

    pub async fn get_last_backup_timestamp(
        &self,
        federation_id: FederationId,
    ) -> Option<SystemTime> {
        let fed = self.get_federation_info(federation_id).await.unwrap();
        fed.last_backup_timestamp
    }

    pub async fn save_last_backup_timestamp(
        &self,
        federation_id: FederationId,
        last_backup_timestamp: SystemTime,
    ) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let fed = info
                .federations
                .get_mut(&RpcFederationId(federation_id))
                .unwrap();
            fed.last_backup_timestamp = Some(last_backup_timestamp);
        }
        self.save().await
    }

    pub async fn get_social_recovery_state(
        &self,
        federation_id: FederationId,
    ) -> Option<SocialRecoveryState> {
        let fed = self.get_federation_info(federation_id).await.unwrap();
        fed.social_recovery_state.clone()
    }

    pub async fn save_social_recovery_state(
        &self,
        federation_id: FederationId,
        social_recovery_state: SocialRecoveryState,
    ) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let fed = info
                .federations
                .get_mut(&RpcFederationId(federation_id))
                .unwrap();
            fed.social_recovery_state = Some(social_recovery_state.clone());
        }
        self.save().await
    }

    pub async fn get_social_recovery_id(&self, federation_id: FederationId) -> Option<RecoveryId> {
        let fed = self.get_federation_info(federation_id).await.unwrap();
        fed.social_recovery_id
    }

    pub async fn save_social_recovery_id(
        &self,
        federation_id: FederationId,
        social_recovery_id: RecoveryId,
    ) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let fed = info
                .federations
                .get_mut(&RpcFederationId(federation_id))
                .unwrap();
            fed.social_recovery_id = Some(social_recovery_id);
        }
        self.save().await
    }

    pub async fn reset_social_recovery(&self, federation_id: FederationId) -> Result<()> {
        {
            let mut info = self.info.lock().await;
            let fed = info
                .federations
                .get_mut(&RpcFederationId(federation_id))
                .unwrap();
            fed.social_recovery_state = None;
            fed.social_recovery_id = None;
        }
        self.save().await
    }
}
