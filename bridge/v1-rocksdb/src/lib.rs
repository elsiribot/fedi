use std::time::SystemTime;

use fedimint_client::sm::OperationId;
use fedimint_core::{
    config::FederationId,
    encoding::{Decodable, Encodable},
    impl_db_lookup, impl_db_record,
};

#[repr(u8)]
pub enum BridgeDbPrefix {
    JoinedFederations = 0xb0,
    ClientConfig = 0xb1,
    XmppUsername = 0xb2,
    InviteCode = 0xb3,
    LastBackupTimestamp = 0xb4,
    SocialRecoveryState = 0xb5,
    SocialRecoveryId = 0xb6,
    TransactionNote = 0xb7,
}

#[derive(Debug, Decodable, Encodable)]
pub struct JoinedFederation(pub FederationId);

#[derive(Clone, Debug, Decodable, Encodable)]
pub struct JoinedFederationsPrefix;

impl_db_record!(
    key = JoinedFederation,
    value = (),
    db_prefix = BridgeDbPrefix::JoinedFederations,
);

impl_db_lookup!(
    key = JoinedFederation,
    query_prefix = JoinedFederationsPrefix
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
    db_prefix = BridgeDbPrefix::TransactionNote,
);
