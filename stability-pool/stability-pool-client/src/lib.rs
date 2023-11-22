use std::collections::BTreeMap;
use std::ffi;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use anyhow::bail;
use async_stream::stream;
use bitcoin::{KeyPair, XOnlyPublicKey};
use common::config::StabilityPoolClientConfig;
use common::{
    AccountInfo, CancelRenewal, IntendedAction, Provide, Seek, StabilityPoolCommonGen,
    StabilityPoolInput, StabilityPoolModuleTypes, StabilityPoolOutput,
};
use fedimint_client::module::init::{ClientModuleInit, ClientModuleInitArgs};
use fedimint_client::module::{ClientContext, ClientModule};
use fedimint_client::oplog::{OperationLogEntry, UpdateStreamOrOutcome};
use fedimint_client::sm::{DynState, State, StateTransition};
use fedimint_client::transaction::{ClientInput, ClientOutput, TransactionBuilder};
use fedimint_client::DynGlobalClientContext;
use fedimint_core::api::{DynModuleApi, FederationApiExt, FederationError};
use fedimint_core::core::{IntoDynInstance, ModuleInstanceId, OperationId};
use fedimint_core::db::DatabaseTransaction;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::{
    ApiRequestErased, ApiVersion, CommonModuleInit, ModuleCommon, ModuleInit, MultiApiVersion,
    TransactionItemAmount,
};
use fedimint_core::{apply, async_trait_maybe_send, Amount, OutPoint, TransactionId};
use futures::StreamExt;
use secp256k1_zkp::Secp256k1;
use serde::{Deserialize, Serialize};
pub use stability_pool_common as common;
use tracing::info;

#[derive(Debug, Clone)]
pub struct StabilityPoolClientInit;

#[apply(async_trait_maybe_send!)]
impl ModuleInit for StabilityPoolClientInit {
    type Common = StabilityPoolCommonGen;

    // No client-side database for stability pool
    async fn dump_database(
        &self,
        _dbtx: &mut DatabaseTransaction<'_>,
        _prefix_names: Vec<String>,
    ) -> Box<dyn Iterator<Item = (String, Box<dyn erased_serde::Serialize + Send>)> + '_> {
        Box::new(BTreeMap::new().into_iter())
    }
}

#[apply(async_trait_maybe_send!)]
impl ClientModuleInit for StabilityPoolClientInit {
    type Module = StabilityPoolClientModule;

    async fn init(&self, args: &ClientModuleInitArgs<Self>) -> anyhow::Result<Self::Module> {
        Ok(StabilityPoolClientModule {
            _cfg: args.cfg().to_owned(),
            client_key_pair: args
                .module_root_secret()
                .to_owned()
                .to_secp_key(&Secp256k1::new()),
            module_api: args.module_api().clone(),
            client_ctx: args.context(),
        })
    }

    fn supported_api_versions(&self) -> MultiApiVersion {
        MultiApiVersion::try_from_iter([ApiVersion { major: 0, minor: 0 }])
            .expect("no version conflicts")
    }
}

#[derive(Debug, Clone)]
pub struct StabilityPoolClientModule {
    _cfg: StabilityPoolClientConfig,
    client_key_pair: KeyPair,
    module_api: DynModuleApi,
    client_ctx: ClientContext<Self>,
}

#[apply(async_trait_maybe_send!)]
impl ClientModule for StabilityPoolClientModule {
    type Init = StabilityPoolClientInit;
    type Common = StabilityPoolModuleTypes;
    type ModuleStateMachineContext = ();
    type States = StabilityPoolStateMachine;

    fn context(&self) -> Self::ModuleStateMachineContext {}

    fn input_amount(
        &self,
        input: &<Self::Common as ModuleCommon>::Input,
    ) -> Option<TransactionItemAmount> {
        let input = input.maybe_v0_ref()?;

        // TODO shaurya figure out fees
        Some(TransactionItemAmount {
            amount: input.amount,
            fee: Amount::ZERO,
        })
    }

    fn output_amount(
        &self,
        output: &<Self::Common as ModuleCommon>::Output,
    ) -> Option<TransactionItemAmount> {
        let output = output.maybe_v0_ref()?;

        // TODO shaurya figure out fees
        Some(TransactionItemAmount {
            amount: match output.intended_action {
                IntendedAction::Seek(Seek(amount)) => amount,
                IntendedAction::Provide(Provide { amount, .. }) => amount,
                IntendedAction::CancelRenewal(_) => Amount::ZERO,
                IntendedAction::UndoCancelRenewal => Amount::ZERO,
            },
            fee: Amount::ZERO,
        })
    }

    async fn handle_cli_command(
        &self,
        args: &[ffi::OsString],
    ) -> anyhow::Result<serde_json::Value> {
        if args.is_empty() {
            return Err(anyhow::format_err!(
                "Expected to be called with at least 1 argument: <command> …"
            ));
        }

        let command = args[0].to_string_lossy();

        match command.as_ref() {
            "account-info" => Ok(serde_json::to_value(self.account_info().await?)?),
            "deposit-to-seek" => {
                if args.len() != 2 {
                    return Err(anyhow::format_err!(
                        "`deposit-to-seek` command expects 1 argument: <amount_msats>"
                    ));
                }

                let seek_amount = args[1].to_string_lossy().parse::<Amount>()?;
                let operation_id = self.deposit_to_seek(seek_amount).await?;
                let mut updates = self
                    .subscribe_deposit_operation(operation_id)
                    .await?
                    .into_stream();

                while let Some(update) = updates.next().await {
                    match update {
                        StabilityPoolDepositState::TxRejected(e) => {
                            return Err(anyhow::Error::msg(format!("TX rejected: {e}")))
                        }
                        StabilityPoolDepositState::PrimaryOutputError(e) => {
                            return Err(anyhow::Error::msg(format!("Change output error: {e}")))
                        }
                        _ => info!("Update: {:?}", update),
                    }
                }

                Ok(serde_json::Value::String(
                    "deposit-to-seek success".to_string(),
                ))
            }
            "deposit-to-provide" => {
                if args.len() != 3 {
                    return Err(anyhow::format_err!(
                        "`deposit-to-provide` command expects 2 arguments: <amount_msats> <fee_rate_ppb>"
                    ));
                }

                let provide_amount = args[1].to_string_lossy().parse::<Amount>()?;
                let provide_fee_rate = args[2].to_string_lossy().parse::<u64>()?;
                let operation_id = self
                    .deposit_to_provide(provide_amount, provide_fee_rate)
                    .await?;
                let mut updates = self
                    .subscribe_deposit_operation(operation_id)
                    .await?
                    .into_stream();

                while let Some(update) = updates.next().await {
                    match update {
                        StabilityPoolDepositState::TxRejected(e) => {
                            return Err(anyhow::Error::msg(format!("TX rejected: {e}")))
                        }
                        StabilityPoolDepositState::PrimaryOutputError(e) => {
                            return Err(anyhow::Error::msg(format!("Change output error: {e}")))
                        }
                        _ => info!("Update: {:?}", update),
                    }
                }

                Ok(serde_json::Value::String(
                    "deposit-to-provide success".to_string(),
                ))
            }
            "withdraw" => {
                if args.len() != 3 {
                    return Err(anyhow::format_err!(
                        "`withdraw` command expects 2 arguments: <unlocked_msats> <locked_bps>"
                    ));
                }

                let unlocked_amount = args[1].to_string_lossy().parse::<Amount>()?;
                let cancellation_bps = args[2].to_string_lossy().parse::<u32>()?;
                let (operation_id, _) = self.withdraw(unlocked_amount, cancellation_bps).await?;
                let mut updates = self.subscribe_withdraw(operation_id).await?.into_stream();

                while let Some(update) = updates.next().await {
                    match update {
                        StabilityPoolWithdrawalState::TxRejected(e) => {
                            return Err(anyhow::Error::msg(format!("TX rejected: {e}")))
                        }
                        StabilityPoolWithdrawalState::PrimaryOutputError(e) => {
                            return Err(anyhow::Error::msg(format!("Primary output error: {e}")))
                        }
                        StabilityPoolWithdrawalState::CancellationSubmissionFailure(e) => {
                            return Err(anyhow::Error::msg(format!(
                                "Cancellation submission failure: {e}"
                            )))
                        }
                        StabilityPoolWithdrawalState::AwaitCycleTurnoverError(e) => {
                            return Err(anyhow::Error::msg(format!(
                                "Await cycle turnover error: {e}"
                            )))
                        }
                        StabilityPoolWithdrawalState::WithdrawIdleSubmissionFailure(e) => {
                            return Err(anyhow::Error::msg(format!(
                                "Withdraw idle submission failure: {e}"
                            )))
                        }
                        _ => info!("Update: {:?}", update),
                    }
                }

                Ok(serde_json::Value::String("withdraw success".to_string()))
            }
            command => Err(anyhow::format_err!(
                "Unknown command: {command}, supported commands: {}",
                [
                    "account-info",
                    "deposit-to-seek",
                    "deposit-to-provide",
                    "withdraw",
                ]
                .join(", ")
            )),
        }
    }
}

#[derive(Debug, Clone, Eq, PartialEq, Decodable, Encodable)]
pub struct StabilityPoolStateMachine;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StabilityPoolMeta {
    // Deposit given amount for seeking or providing
    Deposit {
        txid: TransactionId,
        change_outpoints: Vec<OutPoint>,
        amount: Amount,
    },
    // Cancel auto-renew of given BPS of locked funds
    CancelRenewal {
        txid: TransactionId,
        bps: u32,
    },
    // Withdraw given amount from unlocked balance (idle + staged)
    // followed by auto-renewal cancellation of given BPS
    // of locked funds (could be 0 BPS)
    Withdrawal {
        txid: TransactionId,
        outpoints: Vec<OutPoint>,
        unlocked_amount: Amount,
        locked_bps: u32,
    },
}

impl IntoDynInstance for StabilityPoolStateMachine {
    type DynType = DynState<DynGlobalClientContext>;

    fn into_dyn(self, instance_id: ModuleInstanceId) -> Self::DynType {
        DynState::from_typed(instance_id, self)
    }
}

impl State for StabilityPoolStateMachine {
    type ModuleContext = ();
    type GlobalContext = DynGlobalClientContext;

    fn transitions(
        &self,
        _context: &Self::ModuleContext,
        _global_context: &DynGlobalClientContext,
    ) -> Vec<StateTransition<Self>> {
        unimplemented!()
    }

    fn operation_id(&self) -> OperationId {
        unimplemented!()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StabilityPoolWithdrawalState {
    InvalidOperationType,
    WithdrawUnlockedInitiated,
    TxRejected(String),
    WithdrawUnlockedAccepted,
    PrimaryOutputError(String),
    Success,
    CancellationSubmissionFailure(String),
    CancellationInitiated,
    CancellationAccepted,
    AwaitCycleTurnoverError(String),
    WithdrawIdleSubmissionFailure(String),
    WithdrawIdleInitiated,
    WithdrawIdleAccepted,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StabilityPoolDepositState {
    Initiated,
    TxAccepted,
    TxRejected(String),
    PrimaryOutputError(String),
    Success,
}

impl StabilityPoolClientModule {
    pub async fn account_info(&self) -> anyhow::Result<AccountInfo, FederationError> {
        self.module_api
            .request_current_consensus(
                "account_info".to_string(),
                ApiRequestErased::new(self.client_key_pair.x_only_public_key().0),
            )
            .await
    }

    pub async fn next_cycle_start_time(&self) -> anyhow::Result<u64, FederationError> {
        self.module_api
            .request_current_consensus(
                "next_cycle_start_time".to_string(),
                ApiRequestErased::default(),
            )
            .await
    }

    pub async fn wait_cancellation_processed(&self) -> anyhow::Result<Amount, FederationError> {
        self.module_api
            .request_current_consensus(
                "wait_cancellation_processed".to_string(),
                ApiRequestErased::new(self.client_key_pair.x_only_public_key().0),
            )
            .await
    }

    pub async fn deposit_to_seek(&self, amount: Amount) -> anyhow::Result<OperationId> {
        let (operation_id, _) = submit_tx_with_intended_action(
            &self.client_ctx,
            self.client_key_pair.x_only_public_key().0,
            IntendedAction::Seek(Seek(amount)),
        )
        .await?;
        Ok(operation_id)
    }

    pub async fn deposit_to_provide(
        &self,
        amount: Amount,
        fee_rate: u64,
    ) -> anyhow::Result<OperationId> {
        let (operation_id, _) = submit_tx_with_intended_action(
            &self.client_ctx,
            self.client_key_pair.x_only_public_key().0,
            IntendedAction::Provide(Provide {
                amount,
                min_fee_rate: fee_rate,
            }),
        )
        .await?;
        Ok(operation_id)
    }

    pub async fn subscribe_deposit_operation(
        &self,
        operation_id: OperationId,
    ) -> anyhow::Result<UpdateStreamOrOutcome<StabilityPoolDepositState>> {
        let operation = stability_pool_operation(&self.client_ctx, operation_id).await?;
        let (txid, change_outpoints) = match operation.meta::<StabilityPoolMeta>() {
            StabilityPoolMeta::Deposit {
                txid,
                change_outpoints,
                ..
            } => (txid, change_outpoints),
            _ => bail!("Operation is not of type deposit/cancel-auto-renewal/undo-cancellation"),
        };

        let client_ctx = self.client_ctx.clone();
        Ok(
            operation.outcome_or_updates(&self.client_ctx.global_db(), operation_id, move || {
                stream! {
                    yield StabilityPoolDepositState::Initiated;

                    let tx_updates_stream = client_ctx.transaction_updates(operation_id);
                    match tx_updates_stream.await.await_tx_accepted(txid).await {
                        Ok(_) => {
                            yield StabilityPoolDepositState::TxAccepted;
                            if change_outpoints.is_empty() {
                                yield StabilityPoolDepositState::Success;
                                return
                            }
                        }
                        Err(e) => { yield StabilityPoolDepositState::TxRejected(e);
                            return
                        },
                    }

                    match client_ctx.await_primary_module_outputs(operation_id, change_outpoints).await {
                        Ok(_) => yield StabilityPoolDepositState::Success,
                        Err(e) => yield StabilityPoolDepositState::PrimaryOutputError(e.to_string()),
                    }
                }
            }),
        )
    }

    pub async fn withdraw(
        &self,
        unlocked_amount: Amount,
        locked_bps: u32,
    ) -> anyhow::Result<(OperationId, TransactionId)> {
        if unlocked_amount == Amount::ZERO && locked_bps == 0 {
            bail!("At least one of unlocked_amount and locked_bps must be non-zero");
        }

        let operation_id = OperationId::new_random();

        if unlocked_amount != Amount::ZERO {
            let input = ClientInput {
                input: StabilityPoolInput::new_v0(
                    self.client_key_pair.x_only_public_key().0,
                    unlocked_amount,
                ),
                keys: vec![self.client_key_pair],
                state_machines: Arc::new(move |_, _| Vec::<StabilityPoolStateMachine>::new()),
            };
            let tx = TransactionBuilder::new()
                .with_input(input.into_dyn(self.client_ctx.module_instance_id()));
            let withdrawal_meta_gen = |txid, outpoints| StabilityPoolMeta::Withdrawal {
                txid,
                outpoints,
                unlocked_amount,
                locked_bps,
            };
            let (transaction_id, _) = self
                .client_ctx
                .finalize_and_submit_transaction(
                    operation_id,
                    StabilityPoolCommonGen::KIND.as_str(),
                    withdrawal_meta_gen,
                    tx,
                )
                .await?;
            Ok((operation_id, transaction_id))
        } else {
            submit_tx_with_intended_action(
                &self.client_ctx,
                self.client_key_pair.x_only_public_key().0,
                IntendedAction::CancelRenewal(CancelRenewal { bps: locked_bps }),
            )
            .await
        }
    }

    pub async fn subscribe_withdraw(
        &self,
        operation_id: OperationId,
    ) -> anyhow::Result<UpdateStreamOrOutcome<StabilityPoolWithdrawalState>> {
        let operation = stability_pool_operation(&self.client_ctx, operation_id).await?;
        let operation_meta = operation.meta::<StabilityPoolMeta>();
        let module = self.clone();

        Ok(
            operation.outcome_or_updates(&self.client_ctx.global_db(), operation_id, move || {
                stream! {
                    let (cancellation_op_id, cancellation_tx_id) = match operation_meta {
                        StabilityPoolMeta::Withdrawal { txid, outpoints, locked_bps, .. } => {
                            yield StabilityPoolWithdrawalState::WithdrawUnlockedInitiated;

                            let tx_updates_stream = module.client_ctx.transaction_updates(operation_id);
                            match tx_updates_stream.await.await_tx_accepted(txid).await {
                                Ok(_) => yield StabilityPoolWithdrawalState::WithdrawUnlockedAccepted,
                                Err(e) => {
                                    yield StabilityPoolWithdrawalState::TxRejected(e);
                                    return
                                },
                            }

                            match module.client_ctx.await_primary_module_outputs(operation_id, outpoints).await {
                                Ok(_) => {
                                    if locked_bps == 0 {
                                        yield StabilityPoolWithdrawalState::Success;
                                        return
                                    }
                                }
                                Err(e) => {
                                    yield StabilityPoolWithdrawalState::PrimaryOutputError(e.to_string());
                                    return
                                }
                            }

                            match submit_tx_with_intended_action(
                                &module.client_ctx,
                                module.client_key_pair.x_only_public_key().0,
                                IntendedAction::CancelRenewal(CancelRenewal { bps: locked_bps }),
                            ).await {
                                Ok(ids) => {
                                    yield StabilityPoolWithdrawalState::CancellationInitiated;
                                    ids
                                }
                                Err(e) => {
                                    yield StabilityPoolWithdrawalState::CancellationSubmissionFailure(e.to_string());
                                    return
                                }
                            }
                        },
                        StabilityPoolMeta::CancelRenewal { txid, .. } => {
                            yield StabilityPoolWithdrawalState::CancellationInitiated;
                            (operation_id, txid)
                        },
                        StabilityPoolMeta::Deposit { .. } => {
                            yield StabilityPoolWithdrawalState::InvalidOperationType;
                            return
                        }
                    };

                    let tx_updates_stream = module.client_ctx.transaction_updates(cancellation_op_id);
                    match tx_updates_stream.await.await_tx_accepted(cancellation_tx_id).await {
                        Ok(_) => yield StabilityPoolWithdrawalState::CancellationAccepted,
                        Err(e) => {
                            yield StabilityPoolWithdrawalState::TxRejected(e);
                            return
                        },
                    }

                    let idle_balance = loop {
                        match module.wait_cancellation_processed().await {
                            Ok(amount) => break amount,
                            Err(e) if e.is_retryable() => fedimint_core::task::sleep(Duration::from_secs(10)).await,
                            Err(e) => {
                                yield StabilityPoolWithdrawalState::AwaitCycleTurnoverError(e.to_string());
                                return
                            }
                        }
                    };

                    let (withdraw_idle_op_id, withdraw_idle_tx_id) = match module.withdraw(idle_balance, 0).await {
                        Ok(ids) => {
                            yield StabilityPoolWithdrawalState::WithdrawIdleInitiated;
                            ids
                        }
                        Err(e) => {
                            yield StabilityPoolWithdrawalState::WithdrawIdleSubmissionFailure(e.to_string());
                            return
                        }
                    };

                    let operation = match stability_pool_operation(&module.client_ctx, withdraw_idle_op_id).await {
                        Ok(operation) => operation,
                        Err(_) => {
                            yield StabilityPoolWithdrawalState::InvalidOperationType;
                            return
                        },
                    };
                    let operation_meta = operation.meta::<StabilityPoolMeta>();

                    let outpoints = match operation_meta {
                        StabilityPoolMeta::Withdrawal { outpoints, .. } => outpoints,
                        _ => {
                            yield StabilityPoolWithdrawalState::InvalidOperationType;
                            return
                        },
                    };

                    let tx_updates_stream = module.client_ctx.transaction_updates(withdraw_idle_op_id);
                    match tx_updates_stream.await.await_tx_accepted(withdraw_idle_tx_id).await {
                        Ok(_) => yield StabilityPoolWithdrawalState::WithdrawIdleAccepted,
                        Err(e) => {
                            yield StabilityPoolWithdrawalState::TxRejected(e);
                            return
                        },
                    }

                    match module.client_ctx.await_primary_module_outputs(
                        withdraw_idle_op_id,
                        outpoints,
                    ).await {
                        Ok(_) => yield StabilityPoolWithdrawalState::Success,
                        Err(e) => yield StabilityPoolWithdrawalState::PrimaryOutputError(e.to_string()),
                    }
                }
            }),
        )
    }
}

async fn stability_pool_operation(
    client_ctx: &ClientContext<StabilityPoolClientModule>,
    operation_id: OperationId,
) -> anyhow::Result<OperationLogEntry> {
    let operation = client_ctx.get_operation(operation_id).await?;

    if operation.operation_module_kind() != StabilityPoolCommonGen::KIND.as_str() {
        bail!("Operation is not a stability pool operation");
    }

    Ok(operation)
}

async fn submit_tx_with_intended_action(
    client_ctx: &ClientContext<StabilityPoolClientModule>,
    client_pub_key: XOnlyPublicKey,
    intended_action: IntendedAction,
) -> anyhow::Result<(OperationId, TransactionId)> {
    let operation_id = OperationId::new_random();
    let output = ClientOutput {
        output: StabilityPoolOutput::new_v0(client_pub_key, intended_action.clone()),
        state_machines: Arc::new(move |_, _| Vec::<StabilityPoolStateMachine>::new()),
    };
    let tx =
        TransactionBuilder::new().with_output(output.into_dyn(client_ctx.module_instance_id()));
    let (transaction_id, _) = match intended_action {
        IntendedAction::Seek(Seek(amount)) | IntendedAction::Provide(Provide { amount, .. }) => {
            let deposit_meta_gen = |txid, change_outpoints| StabilityPoolMeta::Deposit {
                txid,
                change_outpoints,
                amount,
            };
            client_ctx
                .finalize_and_submit_transaction(
                    operation_id,
                    StabilityPoolCommonGen::KIND.as_str(),
                    deposit_meta_gen,
                    tx,
                )
                .await?
        }
        IntendedAction::CancelRenewal(CancelRenewal { bps }) => {
            let cancellation_meta_gen = |txid, _| StabilityPoolMeta::CancelRenewal { txid, bps };
            client_ctx
                .finalize_and_submit_transaction(
                    operation_id,
                    StabilityPoolCommonGen::KIND.as_str(),
                    cancellation_meta_gen,
                    tx,
                )
                .await?
        }
        IntendedAction::UndoCancelRenewal => bail!("Not yet supported"),
    };
    Ok((operation_id, transaction_id))
}
