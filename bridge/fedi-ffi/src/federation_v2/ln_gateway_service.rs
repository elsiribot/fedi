use std::sync::Arc;
use std::time::{Duration, SystemTime};

use bitcoin::secp256k1;
use fedimint_client::Client;
use fedimint_core::db::{AutocommitError, IDatabaseTransactionOpsCoreTyped};
use fedimint_ln_client::LightningClientModule;
use fedimint_ln_common::{LightningGateway, LightningGatewayAnnouncement};
use rand::seq::SliceRandom;
use rand::thread_rng;
use tokio::sync::{Mutex, RwLock};

use super::db::LastActiveGatewayKey;

#[derive(Debug, Clone)]
pub struct LnGatewayService {
    state: Arc<State>,
}

trait GatewayAnnouncementsExt {
    /// Filter to only vetted gateways if list has any vetted gateway otherwise
    /// return the original list.
    fn maybe_filter_vetted(self) -> Vec<LightningGatewayAnnouncement>;
}

impl GatewayAnnouncementsExt for Vec<LightningGatewayAnnouncement> {
    /// Filter to only vetted gateways if list has any vetted gateway otherwise
    /// return the original list.
    fn maybe_filter_vetted(self) -> Vec<LightningGatewayAnnouncement> {
        let (vetted, unvetted): (Vec<_>, Vec<_>) = self.into_iter().partition(|g| g.vetted);
        if !vetted.is_empty() {
            vetted
        } else {
            unvetted
        }
    }
}

#[derive(Debug)]
pub struct State {
    last_updated: RwLock<SystemTime>,
    // held while updating the cache to avoid multiple updates at same time.
    updating: Mutex<()>,
}

impl Default for LnGatewayService {
    fn default() -> Self {
        Self::new()
    }
}

impl LnGatewayService {
    pub fn new() -> Self {
        Self {
            state: Arc::new(State {
                last_updated: RwLock::new(SystemTime::UNIX_EPOCH),
                updating: Mutex::new(()),
            }),
        }
    }
    pub async fn update(&self, client: &Client) -> anyhow::Result<()> {
        let old_last_updated = self.last_updated().await;
        let _guard = self.state.updating.lock();
        // just got updated by last lock holder
        if old_last_updated != self.last_updated().await {
            return Ok(());
        }

        client
            .get_first_module::<LightningClientModule>()
            .update_gateway_cache(/* apply_meta= */ true)
            .await?;

        *self.state.last_updated.write().await = fedimint_core::time::now();

        Ok(())
    }

    pub async fn last_updated(&self) -> SystemTime {
        *self.state.last_updated.read().await
    }

    pub async fn needs_update(&self, client: &Client) -> bool {
        let gws = client
            .get_first_module::<LightningClientModule>()
            .list_gateways()
            .await
            .maybe_filter_vetted();
        // any gateway is about expire
        gws.iter().any(|g| g.ttl < Duration::from_secs(60))
    }

    pub async fn update_if_needed(&self, client: &Client) -> anyhow::Result<()> {
        if self.needs_update(client).await {
            self.update(client).await?;
        }
        Ok(())
    }

    pub async fn set_active_gateway(
        &self,
        client: &Client,
        gw_id: &secp256k1::PublicKey,
    ) -> anyhow::Result<()> {
        client
            .db()
            .autocommit(
                |dbtx, _| {
                    Box::pin(async {
                        dbtx.insert_entry(&LastActiveGatewayKey, gw_id).await;
                        Ok(())
                    })
                },
                None,
            )
            .await
            .map_err(|e| match e {
                AutocommitError::CommitFailed { last_error, .. } => last_error,
                AutocommitError::ClosureError { error, .. } => error,
            })
    }

    pub async fn get_active_gateway(&self, client: &Client) -> Option<secp256k1::PublicKey> {
        let mut dbtx = client.db().begin_transaction_nc().await;
        dbtx.get_value(&LastActiveGatewayKey).await
    }

    pub async fn select_gateway(
        &self,
        client: &Client,
    ) -> anyhow::Result<Option<LightningGateway>> {
        let last_active_gateway_id = self.get_active_gateway(client).await;
        self.update_if_needed(client).await?;
        let gws = client
            .get_first_module::<LightningClientModule>()
            .list_gateways()
            .await
            .maybe_filter_vetted();
        if let Some(gw) = gws
            .iter()
            .find(|g| Some(g.info.gateway_id) == last_active_gateway_id)
        {
            Ok(Some(gw.info.clone()))
        } else {
            // select a new random gateway
            let Some(gw) = gws.choose(&mut thread_rng()) else {
                return Ok(None);
            };
            self.set_active_gateway(client, &gw.info.gateway_id).await?;
            Ok(Some(gw.info.clone()))
        }
    }
}
