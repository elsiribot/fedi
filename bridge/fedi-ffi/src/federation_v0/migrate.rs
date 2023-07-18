use std::{collections::HashMap, sync::Arc};

use anyhow::bail;
use fedimint_core_v0::config::ClientConfig;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;
use tracing::info;
use v0_rocksdb::{
    FediClientConfigKey, InviteCodeKey, JoinedFederation, JoinedFederationsPrefix, XmppUsernameKey,
};

use crate::{
    storage::{FederationInfo, FediFile, FediInfo, Storage},
    translate::Translate,
    types::{MultiClientConfig, RpcFederationId},
};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediConfig {
    pub client_config: ClientConfig,
}

/// If no fedi file exists, attempt to initialize one from v0 fedimint database
pub async fn initialize_fedi_file_from_rocksdb(storage: &Storage) -> anyhow::Result<()> {
    // If fedi file exists already, don't attempt migration
    if FediFile::read(storage.clone()).await.is_ok() {
        return Ok(());
    }

    let db = storage.global_database_v0().await?;
    let mut global_dbtx = db.begin_transaction().await;
    let joined_vec = global_dbtx
        .find_by_prefix(&JoinedFederationsPrefix)
        .await
        .map(|item| item.0)
        .collect::<Vec<JoinedFederation>>()
        .await;
    let mut federations = HashMap::new();
    for joined in joined_vec {
        let federation_db = storage.federation_database_v0(&joined.0).await?;
        let mut federation_dbtx = federation_db.begin_transaction().await;
        let xmpp_username = federation_dbtx.get_value(&XmppUsernameKey).await;
        let invite_code = federation_dbtx.get_value(&InviteCodeKey).await;
        let fedi_config = federation_dbtx.get_value(&FediClientConfigKey).await;
        // FIXME: horrible
        let client_config = if let Some(fedi_config) = fedi_config {
            match serde_json::from_str::<FediConfig>(&fedi_config) {
                Ok(fedi_config) => MultiClientConfig::V0(fedi_config.client_config),
                Err(e) => {
                    bail!("Invalid FediConfig: {e:?}");
                }
            }
        } else {
            bail!("FediConfig missing");
        };
        let info = FederationInfo {
            xmpp_username,
            invite_code,
            client_config,
            last_backup_timestamp: None,
            social_recovery_state: None,
            social_recovery_id: None,
        };
        federations.insert(RpcFederationId(joined.0.translate()), info);
    }
    let fedi_info = FediInfo { federations };
    let fedi_file = FediFile {
        info: Arc::new(Mutex::new(fedi_info)),
        storage: storage.clone(),
    };
    fedi_file.save().await?;
    Ok(())
}
