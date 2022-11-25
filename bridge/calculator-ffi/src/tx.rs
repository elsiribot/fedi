use std::time::SystemTime;

use fedimint_api::{
    db::DatabaseKeyPrefixConst,
    encoding::{Decodable, Encodable},
};
use rand::Rng;
use serde::Serialize;

use crate::types::hacky_millisat_to_sat;

const DB_PREFIX_PAYMENTS: u8 = 0x52;

#[derive(Clone, Debug, Encodable, Decodable, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: u64,
    pub created_at: u64,
    pub outgoing: bool,
    pub amount_millis: u64,
    pub amount_sats: u64,
}

impl Transaction {
    pub fn new(outgoing: bool, amount_millis: u64) -> Self {
        let id: u64 = rand::thread_rng().gen();
        Self {
            id,
            outgoing,
            amount_millis,
            created_at: SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .expect("couldn't get utc timestamp") // FIXME: maybe just return 0?
                .as_secs(),
            amount_sats: hacky_millisat_to_sat(amount_millis),
        }
    }
}

#[derive(Debug, Clone, Encodable, Decodable)]
pub struct TransactionKey(pub u64);

impl DatabaseKeyPrefixConst for TransactionKey {
    const DB_PREFIX: u8 = DB_PREFIX_PAYMENTS;
    type Key = Self;
    type Value = Transaction;
}

#[derive(Debug, Clone, Encodable, Decodable)]
pub struct TransactionKeyPrefix;

impl DatabaseKeyPrefixConst for TransactionKeyPrefix {
    const DB_PREFIX: u8 = DB_PREFIX_PAYMENTS;
    type Key = Self;

    type Value = Transaction;
}
