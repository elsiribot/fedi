use std::sync::Arc;

use fedimint_core::task::{MaybeSend, MaybeSync};
use serde::Serialize;
use ts_rs::TS;

use crate::{
    recovery::SocialRecoveryApproval,
    tx::Transaction,
    types::{self, FedimintFederation},
};

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct TransactionEvent {
    pub federation_id: types::FederationId,
    pub transaction: Transaction,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct SocialRecoveryEvent {
    pub federation_id: types::FederationId,
    pub approvals: Vec<SocialRecoveryApproval>,
    pub remaining: usize,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RecoveryFileCreationEvent {
    pub federation_id: types::FederationId,
    // TODO: add payload
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct LogEvent {
    pub log: String,
}

#[derive(Debug, TS)]
#[ts(export, export_to = "target/bindings/")]
pub enum Event {
    Federation { event: FedimintFederation },
    Transaction { event: TransactionEvent },
    SocialRecovery { event: SocialRecoveryEvent },
    RecoveryFileCreation { event: RecoveryFileCreationEvent },
    Log { event: LogEvent },
}

impl Event {
    pub async fn federation(fedimint_federation: FedimintFederation) -> Self {
        Self::Federation {
            event: fedimint_federation,
        }
    }
    pub fn transaction(
        federation_id: fedimint_core::config::FederationId,
        transaction: Transaction,
    ) -> Self {
        Self::Transaction {
            event: TransactionEvent {
                federation_id: federation_id.into(),
                transaction,
            },
        }
    }
    // pub fn social_recovery(federation_id: String) -> Self {
    //     Self::SocialRecovery {
    //         event: SocialRecoveryEvent { federation_id },
    //     }
    // }
    pub fn recovery_file_creation(federation_id: types::FederationId) -> Self {
        Self::RecoveryFileCreation {
            event: RecoveryFileCreationEvent { federation_id },
        }
    }
    pub fn log(log: String) -> Self {
        Self::Log {
            event: LogEvent { log },
        }
    }
}

/// Sends events to iOS / Android layer
pub trait IEventSink: MaybeSend + MaybeSync + 'static {
    /// Send event. Body is JSON-serialized
    fn event(&self, event_type: String, body: String);
    fn events(&self) -> Vec<(String, String)> {
        panic!("IEventSink.events() is only for testing")
    }
    fn num_events_of_type(&self, event_type: String) -> usize {
        panic!("IEventSink.num_events_of_type() is only for testing")
    }
}

pub type EventSink = Arc<dyn IEventSink>;

pub trait TypedEventExt: IEventSink {
    fn typed_event(&self, event: &Event) {
        match event {
            Event::Federation { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "federation".into(), body);
            }
            Event::Transaction { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "transaction".into(), body);
            }
            Event::SocialRecovery { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "socialRecovery".into(), body);
            }
            Event::RecoveryFileCreation { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "recoveryFileCreation".into(), body);
            }
            Event::Log { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                IEventSink::event(self, "log".into(), body);
            }
        };
    }
}

impl<T: IEventSink + ?Sized> TypedEventExt for T {}
