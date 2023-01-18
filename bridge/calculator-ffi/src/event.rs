use serde::Serialize;

use crate::{recovery::SocialRecoveryApproval, tx::Transaction};

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BalanceEvent {
    pub federation_id: String,
    pub balance: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TransactionEvent {
    pub federation_id: String,
    pub transaction: Transaction,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SocialRecoveryEvent {
    pub federation_id: String,
    pub approvals: Vec<SocialRecoveryApproval>,
    pub complete: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryFileCreationEvent {
    pub federation_id: String,
    // TODO: add payload
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub log: String,
}

#[derive(Clone, Debug)]
pub enum Event {
    Balance { event: BalanceEvent },
    Transaction { event: TransactionEvent },
    SocialRecovery { event: SocialRecoveryEvent },
    RecoveryFileCreation { event: RecoveryFileCreationEvent },
    Log { event: LogEvent },
}

impl Event {
    pub fn balance(federation_id: String, balance: u64) -> Self {
        Self::Balance {
            event: BalanceEvent {
                federation_id,
                balance,
            },
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
pub trait EventSink: Send + Sync + 'static {
    /// Send event. Body is JSON-serialized
    fn event(&self, event_type: String, body: String);
}

/// Wrapper around EventSink which JSON serializes messages. This is more ergonomic in Swift / Kotlin
/// than code-generated enums, and RCTEventEmitter has the same arguments.
pub struct EventSinkWrapper {
    pub event_sink: Box<dyn EventSink>,
}

impl EventSinkWrapper {
    pub fn event(&self, event: &Event) {
        match event {
            Event::Balance { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("balance".into(), body);
            }
            Event::Transaction { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("transaction".into(), body);
            }
            Event::SocialRecovery { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("socialRecovery".into(), body);
            }
            Event::RecoveryFileCreation { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("recoveryFileCreation".into(), body);
            }
            Event::Log { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("log".into(), body);
            }
        };
    }
}
