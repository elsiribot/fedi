use std::sync::Arc;

use serde::Serialize;
use ts_rs::TS;

use crate::{recovery::SocialRecoveryApproval, tx::Transaction, types::FedimintFederation};

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct TransactionEvent {
    pub federation_id: String,
    pub transaction: Transaction,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct SocialRecoveryEvent {
    pub federation_id: String,
    pub approvals: Vec<SocialRecoveryApproval>,
    pub remaining: usize,
}

#[derive(Serialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RecoveryFileCreationEvent {
    pub federation_id: String,
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
    pub fn transaction(federation_id: String, transaction: Transaction) -> Self {
        Self::Transaction {
            event: TransactionEvent {
                federation_id,
                transaction,
            },
        }
    }
    // pub fn social_recovery(federation_id: String) -> Self {
    //     Self::SocialRecovery {
    //         event: SocialRecoveryEvent { federation_id },
    //     }
    // }
    pub fn recovery_file_creation(federation_id: String) -> Self {
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
pub trait IEventSink: Send + Sync + 'static {
    /// Send event. Body is JSON-serialized
    fn event(&self, event_type: String, body: String);
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
