use std::time::SystemTime;

use bitcoin::{Address, Txid};
use fedimint_core::{
    db::DatabaseRecord,
    encoding::{Decodable, Encodable},
};
use lightning_invoice::Invoice;
use rand::Rng;
use serde::Serialize;
use ts_rs::TS;

use crate::types::Amount;

const DB_PREFIX_TRANSACTIONS: u8 = 0x52;

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub enum TransactionDirection {
    Send,
    Receive,
}

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub enum IncomingBitcoinTransactionStatus {
    Pending,
    Complete,
}

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct LightningTransactionDetails {
    // TODO: status?
    // FIXME: should this just be crate::Invoice?
    #[ts(type = "any")]
    invoice: Invoice,
    /// Only defined for outgoing transactions
    fee: Option<Amount>,
}

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct BitcoinTransactionDetails {
    #[ts(type = "string")]
    pub address: Address,
    #[ts(type = "string")]
    pub txid: Txid,
    /// Only defined for outgoing transactions
    pub fee: Option<Amount>,
    /// incoming transaction status
    /// FIXME: this is something that should be present in the UI, but perhaps shouldn't be saved in the database?
    pub incoming_status: Option<IncomingBitcoinTransactionStatus>,
}

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct OfflineTransactionDetails {
    // TODO: counterparty name???
    /// Whether the recipient has called `reissue` on these notes
    claimed: bool,
}

#[derive(Clone, Debug, Encodable, Decodable, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct Transaction {
    // FIXME: this is janky ... what should be the primary key?
    // Maybe I should just hash something, like invoice or txid?
    pub id: String,
    pub created_at: u64,
    pub direction: TransactionDirection,
    pub amount: Amount,
    pub notes: String,
    pub lightning: Option<LightningTransactionDetails>,
    pub bitcoin: Option<BitcoinTransactionDetails>,
    pub offline: Option<OfflineTransactionDetails>,
}

impl Transaction {
    pub fn lightning(
        direction: TransactionDirection,
        amount: fedimint_core::Amount,
        fee: Option<fedimint_core::Amount>,
        invoice: Invoice,
    ) -> Self {
        let notes = "".into(); // FIXME
        let id = invoice.payment_hash().to_string();
        let lightning = Some(LightningTransactionDetails {
            invoice,
            fee: fee.map(Amount),
        });
        Self {
            lightning,
            bitcoin: None,
            offline: None,
            id,
            notes,
            direction,
            amount: Amount(amount),
            created_at: fedimint_core::time::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("couldn't get utc timestamp") // FIXME: maybe just return 0?
                .as_secs(),
        }
    }
    pub fn offline(direction: TransactionDirection, amount: fedimint_core::Amount) -> Self {
        let notes = "".into(); // FIXME
        let id: u64 = rand::thread_rng().gen();
        // TODO: don't hard-code this
        let offline = Some(OfflineTransactionDetails { claimed: true });
        Self {
            lightning: None,
            bitcoin: None,
            offline,
            notes,
            id: id.to_string(),
            direction,
            amount: Amount(amount),
            created_at: fedimint_core::time::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("couldn't get utc timestamp") // FIXME: maybe just return 0?
                .as_secs(),
        }
    }

    pub fn bitcoin(
        direction: TransactionDirection,
        amount: fedimint_core::Amount,
        fee: Option<fedimint_core::Amount>,
        address: Address,
        txid: Txid,
        incoming_status: Option<IncomingBitcoinTransactionStatus>,
    ) -> Self {
        let notes = "".into(); // FIXME
        let id = txid.to_string();
        let bitcoin = Some(BitcoinTransactionDetails {
            address,
            txid,
            fee: fee.map(Amount),
            incoming_status,
        });
        Self {
            lightning: None,
            bitcoin,
            offline: None,
            notes,
            id,
            direction,
            amount: Amount(amount),
            created_at: fedimint_core::time::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("couldn't get utc timestamp") // FIXME: maybe just return 0?
                .as_secs(),
        }
    }
}

/// payment hash for lightning, txid for bitcoin (FIXME), random digits for offline
#[derive(Debug, Clone, Encodable, Decodable)]
pub struct TransactionKey(pub String);

impl DatabaseRecord for TransactionKey {
    const DB_PREFIX: u8 = DB_PREFIX_TRANSACTIONS;
    type Key = Self;
    type Value = Transaction;
}

#[derive(Debug, Clone, Encodable, Decodable)]
pub struct TransactionKeyPrefix;

impl DatabaseRecord for TransactionKeyPrefix {
    const DB_PREFIX: u8 = DB_PREFIX_TRANSACTIONS;
    type Key = Self;

    type Value = Transaction;
}
