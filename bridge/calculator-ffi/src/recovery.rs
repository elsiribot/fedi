use fedi_social::common::RecoveryId;
use fedimint_api::{
    db::DatabaseKeyPrefixConst,
    encoding::{Decodable, Encodable},
};
use mint_client::social::SocialRecoveryState;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct SocialRecoveryQr {
    pub recovery_id: RecoveryId,
}

// FIXME: this is stringified FederationId (which doesn't impl Encodable b/c threshold_crypto::PublicKey doesn't)
#[derive(Debug, Clone, Encodable, Decodable)]
pub struct SocialRecoveryStateKey(pub String);

const DB_PREFIX_SOCIAL_RECOVERY_STATE: u8 = 0x53;

impl DatabaseKeyPrefixConst for SocialRecoveryStateKey {
    const DB_PREFIX: u8 = DB_PREFIX_SOCIAL_RECOVERY_STATE;
    type Key = Self;
    type Value = SocialRecoveryState;
}
