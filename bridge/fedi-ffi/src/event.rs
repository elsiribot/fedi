use std::sync::Arc;

use fedimint_core::task::{MaybeSend, MaybeSync};
use serde::Serialize;
use ts_rs::TS;

use super::types::{RpcFederation, RpcFederationId, SocialRecoveryApproval};
use crate::types::{RpcAmount, RpcTransaction};

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
#[ts(export, export_to = "target/bindings/")]
#[ts(rename_all = "camelCase")]
pub struct StabilityPoolEvent {
    pub federation_id: RpcFederationId,
    pub state: StabilityPoolOperationState,
}

#[derive(Serialize, Debug, TS)]
#[ts(export, export_to = "target/bindings/")]
#[ts(rename_all = "camelCase")]
pub enum StabilityPoolOperationState {
    Success,
    Failure(String),
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
    StabilityPoolDeposit(StabilityPoolEvent),
    StabilityPoolWithdraw(StabilityPoolEvent),
}

impl Event {
    pub fn transaction(
        federation_id: fedimint_core::config::FederationId,
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
        federation_id: fedimint_core::config::FederationId,
        balance: fedimint_core::Amount,
    ) -> Self {
        Self::Balance(BalanceEvent {
            federation_id: RpcFederationId(federation_id),
            balance: RpcAmount(balance),
        })
    }
    pub fn stability_pool_deposit(
        federation_id: fedimint_core::config::FederationId,
        state: StabilityPoolOperationState,
    ) -> Self {
        Self::StabilityPoolDeposit(StabilityPoolEvent {
            federation_id: RpcFederationId(federation_id),
            state,
        })
    }

    pub fn stability_pool_withdraw(
        federation_id: fedimint_core::config::FederationId,
        state: StabilityPoolOperationState,
    ) -> Self {
        Self::StabilityPoolWithdraw(StabilityPoolEvent {
            federation_id: RpcFederationId(federation_id),
            state,
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
            Event::StabilityPoolWithdraw(event) => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "stabilityPoolWithdraw".into(), body);
            }
        };
    }
}

impl<T: IEventSink + ?Sized> TypedEventExt for T {}
