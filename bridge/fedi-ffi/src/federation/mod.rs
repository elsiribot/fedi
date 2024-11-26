use std::collections::BTreeMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex, Weak};

use anyhow::{anyhow, Context};
use federation_sm::{FederationState, FederationStateMachine};
use federation_v2::FederationV2;
use federations_locker::FederationsLocker;
use fedimint_core::encoding::Encodable;
use fedimint_core::invite_code::InviteCode;
use tracing::error;

use crate::bridge::Bridge;
use crate::storage::{DatabaseInfo, FederationInfo};

pub mod federation_sm;
pub mod federation_v2;
pub mod federations_locker;

#[derive(Clone)]
pub struct Federations {
    bridge: Weak<Bridge>,
    federations: Arc<Mutex<BTreeMap<String, FederationStateMachine>>>,
    federations_locker: FederationsLocker,
}

impl Federations {
    pub fn new(bridge: Weak<Bridge>) -> Self {
        Federations {
            bridge,
            federations: Default::default(),
            federations_locker: Default::default(),
        }
    }

    pub async fn load_joined_federations_in_background(&self) -> anyhow::Result<()> {
        let bridge = self
            .bridge
            .upgrade()
            .ok_or(anyhow!("unexpected: bridge dropped?"))?;
        let joined_federations = bridge
            .app_state
            .with_read_lock(|state| state.joined_federations.clone())
            .await;

        let mut futures = Vec::new();
        let mut federations = self.federations.lock().expect("posioned");
        for (federation_id, federation_info) in joined_federations {
            if federation_info.version < 2 {
                error!(version = federation_info.version, %federation_id, "Invalid federation version");
                continue;
            }
            let fed_sm = FederationStateMachine::prepare_for_load();
            federations.insert(federation_id.clone(), fed_sm.clone());

            futures.push(load_federation(
                bridge.clone(),
                self.federations_locker.clone(),
                federation_id.clone(),
                federation_info,
                fed_sm,
            ));
        }
        drop(federations);

        // FIXME: update after each federation is loaded.
        let this = self.clone();
        bridge.task_group.clone().spawn_cancellable(
            "load federation and update fedi fee schedule",
            async move {
                futures::future::join_all(futures).await;
                this.update_fedi_fees_schedule().await;
            },
        );

        Ok(())
    }

    /// Joins federation from invite code
    ///
    /// Federation ID saved to global database, new rocksdb database created for
    /// it, and it is saved to local hashmap by ID
    pub async fn join_federation(
        &self,
        invite_code_string: String,
        recover_from_scratch: bool,
    ) -> anyhow::Result<Arc<FederationV2>> {
        let invite_code = InviteCode::from_str(&invite_code_string.to_lowercase())?;
        let federation_id = invite_code.federation_id().to_string();

        let bridge = self
            .bridge
            .upgrade()
            .ok_or(anyhow!("unexpected: bridge dropped?"))?;
        let root_mnemonic = bridge.app_state.root_mnemonic().await;
        let device_index = bridge.app_state.ensure_device_index().await?;

        let db_prefix = bridge
            .app_state
            .new_federation_db_prefix()
            .await
            .context("failed to write AppState")?;
        let db = bridge
            .global_db
            .with_prefix(db_prefix.consensus_encode_to_vec());
        let fed_sm = self
            .federations
            .lock()
            .expect("posoined")
            .entry(federation_id.clone())
            .or_insert_with(FederationStateMachine::prepare_for_join)
            .clone();
        let federation_arc = fed_sm
            .join(
                federation_id,
                invite_code_string,
                &self.federations_locker,
                &bridge.event_sink,
                &bridge.task_group,
                db,
                DatabaseInfo::DatabasePrefix(db_prefix),
                root_mnemonic,
                device_index,
                recover_from_scratch,
                &bridge.fedi_fee_helper,
                &bridge.app_state,
                &bridge.feature_catalog,
            )
            .await?;
        Ok(federation_arc)
    }

    pub fn get_federation_state(&self, federation_id: &str) -> anyhow::Result<FederationState> {
        self.federations
            .lock()
            .expect("posioned")
            .get(federation_id)
            .context("Federation not found")?
            .get_state()
            .context("Federation not found")
    }

    pub fn get_federations_map(&self) -> BTreeMap<String, FederationState> {
        self.federations
            .lock()
            .expect("posioned")
            .clone()
            .iter()
            .filter_map(|(id, fed_sm)| fed_sm.get_state().map(|state| (id.clone(), state)))
            .collect()
    }

    pub async fn leave_federation(&self, federation_id_str: &str) -> anyhow::Result<()> {
        let bridge = self
            .bridge
            .upgrade()
            .ok_or(anyhow!("unexpected: bridge dropped?"))?;
        let fed_sm = self
            .federations
            .lock()
            .expect("posoined")
            .get(federation_id_str)
            .context("Federation not found")?
            .clone();
        fed_sm.leave(&bridge.storage, &bridge.global_db).await?;
        Ok(())
    }

    async fn update_fedi_fees_schedule(&self) {
        // Spawn a new task to asynchronously fetch the fee schedule and update app
        // state
        let fed_network_map = self
            .federations
            .lock()
            .expect("posioned")
            .iter()
            .filter_map(|(id, fed_sm)| match fed_sm.get_state() {
                Some(FederationState::Ready(fed) | FederationState::Recovering(fed)) => {
                    Some((id.clone(), fed.get_network()?))
                }
                _ => None,
            })
            .collect();

        if let Some(bridge) = self.bridge.upgrade() {
            bridge
                .fedi_fee_helper
                .fetch_and_update_fedi_fee_schedule(fed_network_map)
                .await;
        }
    }
}

#[tracing::instrument(skip_all, err, fields(federation_id = federation_id_str))]
async fn load_federation(
    bridge: Arc<Bridge>,
    federations_locker: FederationsLocker,
    federation_id_str: String,
    federation_info: FederationInfo,
    fed_sm: FederationStateMachine,
) -> anyhow::Result<()> {
    let root_mnemonic = bridge.app_state.root_mnemonic().await;
    let device_index = bridge
        .app_state
        .device_index()
        .await
        .context("device index must exist when joined federations exist")?;

    let db = match &federation_info.database {
        DatabaseInfo::DatabaseName(db_name) => {
            bridge.storage.federation_database_v2(db_name).await?
        }
        DatabaseInfo::DatabasePrefix(prefix) => bridge
            .global_db
            .with_prefix(prefix.consensus_encode_to_vec()),
    };

    fed_sm
        .load_from_db(
            federation_id_str,
            db,
            &federations_locker,
            &bridge.event_sink,
            &bridge.task_group,
            root_mnemonic,
            device_index,
            &bridge.fedi_fee_helper,
            &bridge.feature_catalog,
            &bridge.app_state,
        )
        .await;
    Ok(())
}
