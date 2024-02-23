use std::sync::Arc;

use anyhow::bail;
use fedimint_core::core::ModuleKind;
use tracing::error;

use crate::api::IFediApi;
use crate::storage::{AppState, FediFeeSchedule, ModuleFediFeeSchedule};
use crate::types::RpcTransactionDirection;

/// Helper struct to encapsulate all state and logic related to Fedi fee. This
/// struct can be consumed by both the bridge and each individual federation
/// instance. That way we have a single source of truth.
pub struct FediFeeHelper {
    fedi_api: Arc<dyn IFediApi>,
    app_state: Arc<AppState>,
}

#[derive(Debug, thiserror::Error)]
pub enum FediFeeHelperError {
    #[error("Provided federation ID {0} is not registered")]
    UnknownFederation(String),
    #[error("Provided module {0} is not known")]
    UnknownModule(ModuleKind),
}

impl FediFeeHelper {
    pub fn new(fedi_api: Arc<dyn IFediApi>, app_state: Arc<AppState>) -> Self {
        let fedi_fee_helper = Self {
            fedi_api,
            app_state,
        };
        // On initialize, kick off task to fetch and update fee schedule
        fedi_fee_helper.fetch_and_update_fedi_fee_schedule();
        fedi_fee_helper
    }

    /// In a separate task, queries Fedi api to fetch the fee schedule and
    /// updates the AppState
    pub fn fetch_and_update_fedi_fee_schedule(&self) {
        let fedi_api = self.fedi_api.clone();
        let app_state = self.app_state.clone();
        fedimint_core::task::spawn("fetch and update fedi fee schedule", async move {
            // Fetch fee schedule from Fedi API. Presently the endpoint is
            // federation-agnostic. So we just have to do one call, and then we can
            // overwrite all the locally stored fee schedules if the call is successful.
            match fedi_api.fetch_fedi_fee_schedule().await {
                Ok(fedi_fee_schedule) => {
                    let fee_schedule = fedi_fee_schedule.clone();
                    let app_state_update_res = app_state
                        .with_write_lock(|state| {
                            state
                                .joined_federations
                                .iter_mut()
                                .for_each(|(_, fed_info)| {
                                    fed_info.fedi_fee_schedule = fee_schedule.clone();
                                });
                        })
                        .await;

                    if let Err(e) = app_state_update_res {
                        error!("Failed to update app state with new fedi fee schedule {e:?}")
                    }
                }
                Err(e) => error!("Failed to fetch fedi fee schedule {e:?}"),
            }
        });
    }

    /// For the given federation ID returns the full Fedi fee schedule. If the
    /// federation ID is unknown, returns an error.
    pub async fn get_federation_schedule(
        &self,
        federation_id_str: String,
    ) -> anyhow::Result<FediFeeSchedule, FediFeeHelperError> {
        self.app_state
            .with_read_lock(move |state| {
                state
                    .joined_federations
                    .get(&federation_id_str)
                    .ok_or(FediFeeHelperError::UnknownFederation(federation_id_str))
                    .map(|fed_info| fed_info.fedi_fee_schedule.clone())
            })
            .await
    }

    /// For the given:
    /// - federation ID
    /// - module (identified by ModuleKind)
    /// - send/receive direction
    /// returns the fedi fee to be charged in ppm. If either the federation ID
    /// or the module is unknown, returns an error.
    pub async fn get_fedi_fee_ppm(
        &self,
        federation_id_str: String,
        module: ModuleKind,
        direction: RpcTransactionDirection,
    ) -> anyhow::Result<u64, FediFeeHelperError> {
        self.app_state
            .with_read_lock(move |state| {
                state
                    .joined_federations
                    .get(&federation_id_str)
                    .ok_or(FediFeeHelperError::UnknownFederation(federation_id_str))
                    .map(|fed_info| {
                        fed_info
                            .fedi_fee_schedule
                            .modules
                            .get(&module)
                            .ok_or(FediFeeHelperError::UnknownModule(module))
                            .map(|module_schedule| match direction {
                                RpcTransactionDirection::Receive => module_schedule.receive_ppm,
                                RpcTransactionDirection::Send => module_schedule.send_ppm,
                            })
                    })
            })
            .await?
    }

    /// For the given:
    /// - federation ID
    /// - module (identified by ModuleKind)
    /// sets the ModuleFediFeeSchedule. If the federation ID is unknown, returns
    /// an error.
    pub async fn set_module_fee_schedule(
        &self,
        federation_id_str: String,
        module: ModuleKind,
        fee_schedule: ModuleFediFeeSchedule,
    ) -> anyhow::Result<()> {
        self.app_state
            .with_write_lock(|state| {
                let Some(fed_info) = state.joined_federations.get_mut(&federation_id_str) else {
                    bail!(FediFeeHelperError::UnknownFederation(federation_id_str));
                };
                fed_info
                    .fedi_fee_schedule
                    .modules
                    .insert(module, fee_schedule);
                Ok(())
            })
            .await?
    }
}
