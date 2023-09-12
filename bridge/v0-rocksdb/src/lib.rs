use std::time::SystemTime;

use fedimint_client_v0::sm::OperationId;
use fedimint_core::{
    config::FederationId,
    encoding::{Decodable, Encodable},
    impl_db_lookup, impl_db_record,
};

#[repr(u8)]
enum BridgeDbPrefix {
    JoinedFederationsV0 = 0xb0,
    ClientConfig = 0xb1,
    XmppUsername = 0xb2,
    InviteCode = 0xb3,
    LastBackupTimestamp = 0xb4,
    TransactionNotes = 0xb7,
    JoinedFederationsV1 = 0xbf,
}

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederationV0(pub FederationId);

#[derive(Clone, Debug, Decodable, Encodable)]
pub struct JoinedFederationsV0Prefix;

impl_db_record!(
    key = JoinedFederationV0,
    value = (),
    db_prefix = BridgeDbPrefix::JoinedFederationsV0,
);

impl_db_lookup!(
    key = JoinedFederationV0,
    query_prefix = JoinedFederationsV0Prefix
);

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederationV1(pub FederationId);

#[derive(Clone, Debug, Decodable, Encodable)]
pub struct JoinedFederationsV1Prefix;

impl_db_record!(
    key = JoinedFederationV1,
    value = String, // database name
    db_prefix = BridgeDbPrefix::JoinedFederationsV1,
);

impl_db_lookup!(
    key = JoinedFederationV1,
    query_prefix = JoinedFederationsV1Prefix
);

#[derive(Debug, Decodable, Encodable)]
pub struct FediClientConfigKey;

impl_db_record!(
    key = FediClientConfigKey,
    value = String,
    db_prefix = BridgeDbPrefix::ClientConfig,
);

#[derive(Debug, Decodable, Encodable)]
pub struct XmppUsernameKey;

impl_db_record!(
    key = XmppUsernameKey,
    value = String,
    db_prefix = BridgeDbPrefix::XmppUsername,
);

#[derive(Debug, Decodable, Encodable)]
pub struct InviteCodeKey;

impl_db_record!(
    key = InviteCodeKey,
    value = String,
    db_prefix = BridgeDbPrefix::InviteCode,
);

#[derive(Debug, Decodable, Encodable)]
pub struct LastBackupTimestampKey;

impl fedimint_core::db::DatabaseRecord for LastBackupTimestampKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::LastBackupTimestamp as u8;
    type Key = Self;
    type Value = SystemTime;
}

#[derive(Debug, Decodable, Encodable)]
pub struct TransactionNotesKey(pub OperationId);

impl_db_record!(
    key = TransactionNotesKey,
    value = String,
    db_prefix = BridgeDbPrefix::TransactionNotes,
);
