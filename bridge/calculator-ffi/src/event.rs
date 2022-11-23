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

#[derive(Clone, Debug)]
pub enum Event {
    Balance { event: BalanceEvent },
    ReceivedLightning { event: ReceivedLightningEvent },
    ReceivedBitcoin { event: ReceivedBitcoinEvent },
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
}
