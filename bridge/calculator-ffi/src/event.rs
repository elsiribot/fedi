use bitcoin::{Address, Txid};
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BalanceEvent {
    pub federation_id: String,
    pub balance: u64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedLightningEvent {
    pub federation_id: String,
    pub payment_hash: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ReceivedBitcoinEvent {
    pub federation_id: String,
    pub txid: String,
    pub address: String,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub log: String,
}

#[derive(Clone, Debug)]
pub enum Event {
    Balance { event: BalanceEvent },
    ReceivedLightning { event: ReceivedLightningEvent },
    ReceivedBitcoin { event: ReceivedBitcoinEvent },
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
    pub fn received_lightning(federation_id: String, payment_hash: String) -> Self {
        Self::ReceivedLightning {
            event: ReceivedLightningEvent {
                federation_id,
                payment_hash,
            },
        }
    }
    pub fn received_bitcoin(federation_id: String, txid: &Txid, address: &Address) -> Self {
        Self::ReceivedBitcoin {
            event: ReceivedBitcoinEvent {
                federation_id,
                txid: txid.to_string(),
                address: address.to_string(),
            },
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
            Event::ReceivedLightning { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("receivedLightning".into(), body);
            }
            Event::ReceivedBitcoin { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("receivedBitcoin".into(), body);
            }
            Event::Log { event } => {
                let body = serde_json::to_string(&event).expect("failed to json serialize");
                self.event_sink.event("log".into(), body);
            }
        };
    }
}
