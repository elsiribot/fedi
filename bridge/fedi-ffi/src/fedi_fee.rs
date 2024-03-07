use std::collections::{HashMap, HashSet};
use std::sync::Arc;

use anyhow::{anyhow, bail, Context};
use bitcoin::Network;
use fedimint_core::core::ModuleKind;
use fedimint_core::db::IDatabaseTransactionOpsCoreTyped;
use fedimint_core::task::{TaskGroup, TaskHandle};
use fedimint_core::Amount;
use fedimint_ln_client::{LightningClientModule, OutgoingLightningPayment};
use futures::FutureExt;
use lightning_invoice::Bolt11Invoice;
use tokio::sync::mpsc::{Receiver, Sender};
use tracing::{error, info, warn};

use crate::api::IFediApi;
use crate::constants::MILLION;
use crate::federation_v2::db::OutstandingFediFeesKey;
use crate::federation_v2::FederationV2;
use crate::storage::{AppState, FediFeeSchedule, ModuleFediFeeSchedule};
use crate::types::{LightningSendMetadata, RpcTransactionDirection};

/// Helper struct to encapsulate all state and logic related to Fedi fee. This
/// struct can be consumed by both the bridge and each individual federation
/// instance. That way we have a single source of truth.
pub struct FediFeeHelper {
    fedi_api: Arc<dyn IFediApi>,
    app_state: Arc<AppState>,
    task_group: TaskGroup,
}

#[derive(Debug, thiserror::Error)]
pub enum FediFeeHelperError {
    #[error("Provided federation ID {0} is not registered")]
    UnknownFederation(String),
    #[error("Provided module {0} is not known")]
    UnknownModule(ModuleKind),
}

impl FediFeeHelper {
    pub fn new(
        fedi_api: Arc<dyn IFediApi>,
        app_state: Arc<AppState>,
        task_group: TaskGroup,
    ) -> Self {
        Self {
            fedi_api,
            app_state,
            task_group,
        }
    }

    /// In a separate task, queries Fedi api to fetch the fee schedule and
    /// updates the AppState
    pub async fn fetch_and_update_fedi_fee_schedule(
        &self,
        fed_network_map: HashMap<String, Network>,
    ) {
        let fedi_api = self.fedi_api.clone();
        let app_state = self.app_state.clone();
        self.task_group
            .clone()
            .spawn("fetch and update fedi fee schedule", move |_| async move {
                // Fetch fee schedule from Fedi API. Presently the endpoint is different per
                // network (mainnet, mutinynet etc.). So we iterate through the mapping of
                // federation => network and collect a set-union of all the networks. Then we
                // make an API call for each network we need, and finally we update each
                // federation's FederationInfo within AppState with the correct fee schedule.
                let networks = fed_network_map.values().cloned().collect::<HashSet<_>>();
                let api_calls = networks.iter().map(|network| {
                    let fedi_api = fedi_api.clone();
                    async move {
                        match fedi_api.fetch_fedi_fee_schedule(*network).await {
                            Ok(fedi_fee_schedule) => (*network, Some(fedi_fee_schedule)),
                            Err(error) => {
                                error!(%network, ?error, "Failed to fetch fedi fee schedule");
                                (*network, None)
                            }
                        }
                    }
                });
                let network_fee_schedule_map = futures::future::join_all(api_calls)
                    .await
                    .into_iter()
                    .filter_map(|(network, schedule)| Some((network, schedule?)))
                    .collect::<HashMap<_, _>>();
                let app_state_update_res = app_state
                    .with_write_lock(|state| {
                        state.joined_federations.iter_mut().for_each(|(id, info)| {
                            // Only proceed if this federation was provided in the input map
                            let Some(network) = fed_network_map.get(id) else {
                                warn!(%id, "Federation not provided as input to fee-fetch task");
                                return;
                            };

                            // Only proceed if we have fetched a fee schedule for the fed's network
                            let Some(fedi_fee_schedule) = network_fee_schedule_map.get(network)
                            else {
                                return;
                            };

                            info.fedi_fee_schedule = fedi_fee_schedule.clone();
                        })
                    })
                    .await;

                if let Err(error) = app_state_update_res {
                    error!(
                        ?error,
                        "Failed to update app state with new fedi fee schedule"
                    )
                }
            })
            .await;
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

    /// Queries Fedi api to fetch a lightning invoice for the given amount so
    /// that accrued oustanding fees may be remitted. Note that fee is accrued
    /// and remitted at the federation-level (and not at the bridge-level), even
    /// though this method is federation agnostic (because only an amount is
    /// needed to ask for an invoice).
    pub async fn fetch_fedi_fee_invoice(
        &self,
        amount: Amount,
        network: Network,
    ) -> anyhow::Result<Bolt11Invoice> {
        self.fedi_api.fetch_fedi_fee_invoice(amount, network).await
    }
}

pub struct FeeRemittanceRequest {}

// Service that spawns a task to remit accrued oustanding fedi fee. We use a
// channel to communicate with the task. Whenever the channel sends through a
// request, the task checks whether enough fee has been accrued, and if so, it
// attempts to remit the fee to fedi.
#[derive(Clone)]
pub struct FediFeeRemittanceService {
    tx: Sender<FeeRemittanceRequest>,
}

impl FediFeeRemittanceService {
    pub async fn new(fed: FederationV2) -> Self {
        let (tx, rx) = tokio::sync::mpsc::channel(10);
        let tg = fed.task_group.clone();
        tg.spawn("fedi_fee_remittance_service", move |handle| {
            Self::task(fed, handle, rx)
        })
        .await;
        Self { tx }
    }

    pub async fn trigger_fee_remittance(&self) -> anyhow::Result<()> {
        self.tx
            .send(FeeRemittanceRequest {})
            .await
            .context("fee remittance service died")
    }

    /// Checks whether the accrued outstanding fedi fees has surpassed the
    /// remittance threshold. If yes, queries the fee helper to obtain a
    /// lightning invoice to remit the fees. If the accrued outstanding fees has
    /// not surpassed the threshold, returns Ok(false). If the fees HAS
    /// surpassed the threshold, and we were able to successfully obtain a
    /// lightning invoice and initiate payment, returns Ok(true). Otherwise,
    /// returns any error we may have encountered in the remittance process.
    async fn remit_fedi_fee_if_threshold_met(fed: &FederationV2) -> anyhow::Result<bool> {
        let outstanding_fees = fed.get_outstanding_fedi_fees().await;
        let remittance_threshold = fed.fedi_fee_schedule().await.remittance_threshold_msat;
        if outstanding_fees.msats < remittance_threshold {
            return Ok(false);
        }

        fed.override_active_gateway().await?;
        let gateway = fed
            .client
            .get_first_module::<LightningClientModule>()
            .select_active_gateway()
            .await?;
        let gateway_fees = gateway.fees;

        // We want to ensure that any gateway fees is debited from the accrued
        // outstanding fees. This means that the invoice amount for remitting fees will
        // actually be less than the accrued outstanding fees.

        // Let's say that the accrued oustanding fees is Q and the desired invoice
        // amount is X. Gateway fees is made up of two components, (base) and (ppm).
        // Therefore, the following equation must be satisfied:
        // X + (gateway fees) = Q
        //
        // Expanding (gateway fees), we get:
        // X + (base) + [(X/M)(ppm)] = Q, where M is the constant for MILLION
        //
        // Solving for X, we get:
        // X[1 + (ppm)/M] = Q - base
        //
        // Finally:
        // X = [(M)(Q - base)]/(M + ppm)
        //
        // We keep division as the very last step to ensure minimal loss in precision.
        // We also perform regular (floor) division to ensure that the invoice is never
        // overestimated.
        let invoice_amt_numerator =
            MILLION * (outstanding_fees.msats - gateway_fees.base_msat as u64);
        let invoice_amt_denominator = MILLION + gateway_fees.proportional_millionths as u64;
        let invoice_amt = invoice_amt_numerator / invoice_amt_denominator;

        let invoice = fed
            .fedi_fee_helper
            .fetch_fedi_fee_invoice(
                Amount::from_msats(invoice_amt),
                fed.get_network().ok_or(anyhow!(
                    "Federation recovering during fee remittance, unexpected!"
                ))?,
            )
            .await?;

        // If pay_bolt11_invoice() returns successfully, we optimistically zero out
        // oustanding fedi fees. This is ok since as part of pay_bolt11_invoice(), the
        // ecash to pay the invoice would have already been deducted from the "real"
        // balance and therefore the "virtual" balance should remain unaffected even if
        // we zero out the accrued oustanding fees at this point. Note that it is still
        // possible for the lightning payment to fail for a variety of reasons but we
        // will address such edge cases and race conditions later. For now, losing fee
        // sometimes is a much better outcome than double-charging fees.
        let extra_meta = LightningSendMetadata {
            is_fedi_fee_remittance: true,
        };
        let ln = fed.client.get_first_module::<LightningClientModule>();
        let active_gw = ln.select_active_gateway_opt().await;
        let OutgoingLightningPayment { payment_type, .. } = ln
            .pay_bolt11_invoice(active_gw, invoice.to_owned(), extra_meta.clone())
            .await?;
        fed.client
            .db()
            .autocommit(
                |dbtx, _| {
                    Box::pin(async move {
                        let current_outstanding_fees = dbtx
                            .get_value(&OutstandingFediFeesKey)
                            .await
                            .unwrap_or(Amount::ZERO);
                        let new_outstanding_fees =
                            current_outstanding_fees.saturating_sub(outstanding_fees);
                        dbtx.insert_entry(&OutstandingFediFeesKey, &new_outstanding_fees)
                            .await;
                        Ok::<(), anyhow::Error>(())
                    })
                },
                Some(100),
            )
            .await
            .map_err(|e| match e {
                fedimint_core::db::AutocommitError::CommitFailed { last_error, .. } => last_error,
                fedimint_core::db::AutocommitError::ClosureError { error, .. } => error,
            })?;

        // If payment fails, un-zero the oustanding fee before returning the error.
        if let Err(e) = fed
            .subscribe_to_ln_pay(payment_type, extra_meta, invoice.clone())
            .await
        {
            fed.client
                .db()
                .autocommit(
                    |dbtx, _| {
                        Box::pin(async move {
                            let current_outstanding_fees = dbtx
                                .get_value(&OutstandingFediFeesKey)
                                .await
                                .unwrap_or(Amount::ZERO);
                            let new_outstanding_fees = current_outstanding_fees + outstanding_fees;
                            dbtx.insert_entry(&OutstandingFediFeesKey, &new_outstanding_fees)
                                .await;
                            Ok::<(), anyhow::Error>(())
                        })
                    },
                    Some(100),
                )
                .await
                .map_err(|e| match e {
                    fedimint_core::db::AutocommitError::CommitFailed { last_error, .. } => {
                        last_error
                    }
                    fedimint_core::db::AutocommitError::ClosureError { error, .. } => error,
                })?;
            return Err(e);
        }

        Ok(true)
    }

    async fn task(
        fed: FederationV2,
        handle: TaskHandle,
        mut request_rx: Receiver<FeeRemittanceRequest>,
    ) {
        let mut shutdown = handle.make_shutdown_rx().await.fuse();
        loop {
            let result = tokio::select! {
                biased;
                _ = &mut shutdown => {
                    info!("fedi_fee_remittance_service shutting down");
                    break;
                }
                msg = request_rx.recv() => {
                    match msg {
                        Some(_) => {
                            Self::remit_fedi_fee_if_threshold_met(&fed).await
                        }
                        None => {
                            info!("fedi_fee_remittance_service shutting down on drop");
                            break;
                        }
                    }
                }
            };

            match result {
                Ok(true) => info!(
                    "Successfully initiated fedi fee remittance, accrued fee exceeds threshold"
                ),
                Ok(false) => {
                    info!("Fedi fee remittance not initiated, accrued fee doesn't exceed threshold")
                }
                Err(e) => warn!("Error initiating fedi fee remittance {e:?}"),
            }
        }
    }
}
