use std::sync::Arc;

use fedimint_core::task::{MaybeSend, MaybeSync};
use serde::Serialize;
use ts_rs::TS;

use super::types::{RpcFederation, RpcFederationId, SocialRecoveryApproval};
use crate::types::RpcTransaction;

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

#[derive(Debug, TS)]
#[ts(export, export_to = "target/bindings/")]
pub enum Event {
    Transaction { event: TransactionEvent },
    Log { event: LogEvent },
    Federation { event: RpcFederation },
}

impl Event {
    pub fn transaction(
        federation_id: fedimint_core::config::FederationId,
        transaction: RpcTransaction,
    ) -> Self {
        Self::Transaction {
            event: TransactionEvent {
                federation_id: RpcFederationId(federation_id),
                transaction,
            },
        }
    }
    pub fn log(log: String) -> Self {
        Self::Log {
            event: LogEvent { log },
        }
    }
    pub async fn federation(federation: RpcFederation) -> Self {
        Self::Federation { event: federation }
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
            Event::Log { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "log".into(), body);
            }
            Event::Transaction { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "transaction".into(), body);
            }
            Event::Federation { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "federation".into(), body);
            }
        };
    }
}

impl<T: IEventSink + ?Sized> TypedEventExt for T {}
