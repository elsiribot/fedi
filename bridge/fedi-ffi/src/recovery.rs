use fedi_social_client::RecoveryId;
use fedimint_core::{
    config::FederationId,
    db::DatabaseRecord,
    encoding::{Decodable, Encodable},
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::{social::SocialRecoveryState, types};

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SocialRecoveryQr {
    pub recovery_id: types::RecoveryId,
}

/// This type is set to React Native and displayed in the UI
#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct SocialRecoveryApproval {
    // FIXME: perhaps this should be peer id and client can look up the name ???
    pub guardian_name: String,
    pub approved: bool,
}

// FIXME: this doesn't actually need a federation id because rocksdb is per-federation
#[derive(Debug, Clone, Encodable, Decodable)]
pub struct SocialRecoveryStateKey(pub FederationId);

const DB_PREFIX_SOCIAL_RECOVERY_STATE: u8 = 0x53;

impl DatabaseRecord for SocialRecoveryStateKey {
    const DB_PREFIX: u8 = DB_PREFIX_SOCIAL_RECOVERY_STATE;
    type Key = Self;
    type Value = SocialRecoveryState;
}

// TODO: this should be stored inside SocialRecoveryState
// FIXME: this doesn't actually need a federation id because rocksdb is per-federation
#[derive(Debug, Clone, Encodable, Decodable)]
pub struct SocialRecoveryIdKey(pub FederationId);

const DB_PREFIX_SOCIAL_RECOVERY_ID_STATE: u8 = 0x54;

impl DatabaseRecord for SocialRecoveryIdKey {
    const DB_PREFIX: u8 = DB_PREFIX_SOCIAL_RECOVERY_ID_STATE;
    type Key = Self;
    type Value = RecoveryId;
}
