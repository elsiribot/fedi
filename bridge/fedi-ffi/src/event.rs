use std::sync::Arc;

use fedimint_core_v1::task::{MaybeSend, MaybeSync};
use serde::Serialize;
use ts_rs::TS;

use super::types::{
    RpcFederation, RpcFederationId, RpcOperationId, RpcTransaction, SocialRecoveryApproval,
};
use crate::types::RpcAmount;

#[derive(Serialize, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct TransactionEvent {
    pub federation_id: RpcFederationId,
    pub transaction: RpcTransaction,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct LogEvent {
    pub log: String,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct SocialRecoveryEvent {
    pub federation_id: RpcFederationId,
    pub approvals: Vec<SocialRecoveryApproval>,
    pub remaining: usize,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct PanicEvent {
    pub message: String,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct BalanceEvent {
    pub federation_id: RpcFederationId,
    pub balance: RpcAmount,
}

#[derive(Serialize, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct StabilityPoolDepositEvent {
    pub federation_id: RpcFederationId,
    pub operation_id: RpcOperationId,
    pub state: StabilityPoolDepositState,
}

#[derive(Serialize, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub enum StabilityPoolDepositState {
    Initiated,
    TxAccepted,
    TxRejected(String),
    PrimaryOutputError(String),
    Success,
}

#[derive(Serialize, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct StabilityPoolWithdrawalEvent {
    pub federation_id: RpcFederationId,
    pub operation_id: RpcOperationId,
    pub state: StabilityPoolWithdrawalState,
}

#[derive(Serialize, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
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

#[derive(Debug, TS)]
#[ts(export, export_to = "target/bindings/")]
#[ts(rename_all = "camelCase")]
pub enum Event {
    Transaction(TransactionEvent),
    Log(LogEvent),
    Federation(RpcFederation),
    Balance(BalanceEvent),
    Panic(PanicEvent),
    StabilityPoolDeposit(StabilityPoolDepositEvent),
    StabilityPoolWithdrawal(StabilityPoolWithdrawalEvent),
}

impl Event {
    pub fn transaction(
        federation_id: fedimint_core_v1::config::FederationId,
        transaction: RpcTransaction,
    ) -> Self {
        Self::Transaction(TransactionEvent {
            federation_id: RpcFederationId(federation_id),
            transaction,
        })
    }
    pub fn log(log: String) -> Self {
        Self::Log(LogEvent { log })
    }
    pub fn federation(federation: RpcFederation) -> Self {
        Self::Federation(federation)
    }
    pub fn balance(
        federation_id: fedimint_core_v1::config::FederationId,
        balance: fedimint_core_v1::Amount,
    ) -> Self {
        Self::Balance(BalanceEvent {
            federation_id: RpcFederationId(federation_id),
            balance: RpcAmount(balance),
        })
    }
    pub fn stability_pool_deposit(
        federation_id: fedimint_core_v1::config::FederationId,
        operation_id: fedimint_client_v1::sm::OperationId,
        state: stability_pool_client_v1::StabilityPoolDepositState,
    ) -> Self {
        Self::StabilityPoolDeposit(StabilityPoolDepositEvent {
            federation_id: RpcFederationId(federation_id),
            operation_id: RpcOperationId(operation_id),
            state: match state {
                stability_pool_client_v1::StabilityPoolDepositState::Initiated => {
                    StabilityPoolDepositState::Initiated
                }
                stability_pool_client_v1::StabilityPoolDepositState::TxAccepted => {
                    StabilityPoolDepositState::TxAccepted
                }
                stability_pool_client_v1::StabilityPoolDepositState::TxRejected(e) => {
                    StabilityPoolDepositState::TxRejected(e.to_string())
                }
                stability_pool_client_v1::StabilityPoolDepositState::PrimaryOutputError(e) => {
                    StabilityPoolDepositState::PrimaryOutputError(e.to_string())
                }
                stability_pool_client_v1::StabilityPoolDepositState::Success => {
                    StabilityPoolDepositState::Success
                }
            },
        })
    }

    pub fn stability_pool_withdrawal(
        federation_id: fedimint_core_v1::config::FederationId,
        operation_id: fedimint_client_v1::sm::OperationId,
        state: stability_pool_client_v1::StabilityPoolWithdrawalState,
    ) -> Self {
        Self::StabilityPoolWithdrawal(StabilityPoolWithdrawalEvent {
            federation_id: RpcFederationId(federation_id),
            operation_id: RpcOperationId(operation_id),
            state: match state {
                stability_pool_client_v1::StabilityPoolWithdrawalState::InvalidOperationType => StabilityPoolWithdrawalState::InvalidOperationType,
                stability_pool_client_v1::StabilityPoolWithdrawalState::WithdrawUnlockedInitiated => StabilityPoolWithdrawalState::WithdrawUnlockedInitiated,
                stability_pool_client_v1::StabilityPoolWithdrawalState::TxRejected(e) => StabilityPoolWithdrawalState::TxRejected(e.to_string()),
                stability_pool_client_v1::StabilityPoolWithdrawalState::WithdrawUnlockedAccepted => StabilityPoolWithdrawalState::WithdrawUnlockedAccepted,
                stability_pool_client_v1::StabilityPoolWithdrawalState::PrimaryOutputError(e) => StabilityPoolWithdrawalState::PrimaryOutputError(e),
                stability_pool_client_v1::StabilityPoolWithdrawalState::Success => StabilityPoolWithdrawalState::Success,
                stability_pool_client_v1::StabilityPoolWithdrawalState::CancellationSubmissionFailure(e) => StabilityPoolWithdrawalState::CancellationSubmissionFailure(e),
                stability_pool_client_v1::StabilityPoolWithdrawalState::CancellationInitiated => StabilityPoolWithdrawalState::CancellationInitiated,
                stability_pool_client_v1::StabilityPoolWithdrawalState::CancellationAccepted => StabilityPoolWithdrawalState::CancellationAccepted,
                stability_pool_client_v1::StabilityPoolWithdrawalState::AwaitCycleTurnoverError(e) => StabilityPoolWithdrawalState::AwaitCycleTurnoverError(e),
                stability_pool_client_v1::StabilityPoolWithdrawalState::WithdrawIdleSubmissionFailure(e) => StabilityPoolWithdrawalState::WithdrawIdleSubmissionFailure(e),
                stability_pool_client_v1::StabilityPoolWithdrawalState::WithdrawIdleInitiated => StabilityPoolWithdrawalState::WithdrawIdleInitiated,
                stability_pool_client_v1::StabilityPoolWithdrawalState::WithdrawIdleAccepted => StabilityPoolWithdrawalState::WithdrawIdleAccepted,
            },
        })
    }
}

/// Sends events to iOS / Android layer
pub trait IEventSink: MaybeSend + MaybeSync + 'static {
    /// Send event. Body is JSON-serialized
    fn event(&self, event_type: String, body: String);
    fn events(&self) -> Vec<(String, String)> {
        panic!("IEventSink.events() is only for testing")
    }
    fn num_events_of_type(&self, _event_type: String) -> usize {
        panic!("IEventSink.num_events_of_type() is only for testing")
    }
}

pub type EventSink = Arc<dyn IEventSink>;

pub trait TypedEventExt: IEventSink {
    fn typed_event(&self, event: &Event) {
        match event {
            Event::Log(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "log".into(), body);
            }
            Event::Transaction(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "transaction".into(), body);
            }
            Event::Federation(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "federation".into(), body);
            }
            Event::Balance(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "balance".into(), body);
            }
            Event::Panic(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "panic".into(), body);
            }
            Event::StabilityPoolDeposit(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "stabilityPoolDeposit".into(), body);
            }
            Event::StabilityPoolWithdrawal(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "stabilityPoolWithdrawal".into(), body);
            }
        };
    }
}

impl<T: IEventSink + ?Sized> TypedEventExt for T {}
