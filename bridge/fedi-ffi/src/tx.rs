use std::time::SystemTime;

use bitcoin::{Address, Txid};
use fedimint_core::{
    db::DatabaseRecord,
    encoding::{Decodable, Encodable},
};
use fedimint_ln_client::{pay::GatewayPayError, LnPayState, LnReceiveState};
use fedimint_mint_client::{ReissueExternalNotesState, SpendOOBState};
use lightning_invoice::Invoice;
use rand::Rng;
use serde::{Deserialize, Serialize};
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
pub struct OfflineTransactionDetails {
    // TODO: counterparty name???
    /// Whether the recipient has called `reissue` on these notes
    claimed: bool,
}
#[derive(Debug, Clone, Eq, PartialEq, Serialize, Deserialize, Encodable, Decodable)]
#[serde(tag = "type")]
pub enum MyLnPayState {
    Created,
    Canceled,
    Funded,
    WaitingForRefund {
        block_height: u32,
        gateway_error: GatewayPayError,
    },
    AwaitingChange,
    Success {
        preimage: String,
    },
    Refunded {
        gateway_error: GatewayPayError,
    },
    Failed,
}

impl From<LnPayState> for MyLnPayState {
    fn from(state: LnPayState) -> Self {
        match state {
            LnPayState::Created => Self::Created,
            LnPayState::Canceled => Self::Canceled,
            LnPayState::Funded => Self::Funded,
            LnPayState::WaitingForRefund {
                block_height,
                gateway_error,
            } => Self::WaitingForRefund {
                block_height,
                gateway_error,
            },
            LnPayState::AwaitingChange => Self::AwaitingChange,
            LnPayState::Success { preimage } => Self::Success { preimage },
            LnPayState::Refunded { gateway_error } => Self::Refunded { gateway_error },
            LnPayState::Failed => Self::Failed,
        }
    }
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
    // HACK: this has been repurposed to transaction state
    #[ts(type = "any")]
    #[serde(rename = "lnPayState")]
    pub bitcoin: Option<MyLnPayState>,
    pub offline: Option<OfflineTransactionDetails>,
}

impl Transaction {
    pub fn lightning(
        direction: TransactionDirection,
        amount: fedimint_core::Amount,
        fee: Option<fedimint_core::Amount>,
        invoice: Invoice,
        ln_pay_state: Option<LnPayState>,
    ) -> Self {
        let notes = "".into(); // FIXME
        let id = invoice.payment_hash().to_string();
        let lightning = Some(LightningTransactionDetails {
            invoice,
            fee: fee.map(Amount),
        });
        Self {
            lightning,
            bitcoin: ln_pay_state.map(|s| s.into()),
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
