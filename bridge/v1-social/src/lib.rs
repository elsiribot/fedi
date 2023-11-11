use std::collections::BTreeMap;
use std::fmt;

use bitcoin::secp256k1;
use fedi_social_client_v1::common::{
    DoubleEncryptedData, RecoveryId, SerdeEncodable, VerificationDocument,
};
use fedimint_core::config::FederationId;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::registry::ModuleDecoderRegistry;
use fedimint_core::PeerId;
use serde::{Deserialize, Serialize};
use v1_rocksdb::BridgeDbPrefix;

// TODO: Actually implement. Use some bip39 crate instead?
#[derive(Serialize, Deserialize, Encodable, Decodable, PartialEq, Eq, Clone)]
pub struct UserSeedPhrase(pub String);

impl fmt::Debug for UserSeedPhrase {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "UserSeedPhrase([redacted])")
    }
}

impl From<String> for UserSeedPhrase {
    fn from(s: String) -> Self {
        Self(s)
    }
}

impl From<&str> for UserSeedPhrase {
    fn from(s: &str) -> Self {
        Self(s.into())
    }
}

/// Data needed to recover from the backup after Federation decrypts it.
///
/// This needs to be stored by the user in some reasonably safe place (like
/// Dropbox, email) etc. ideally in multiple copies. It is neccessary for the
/// recovery, but whoever has access to it still needs to pass in-person
/// verification by federation members to decrypt the seed phrase.
#[derive(Clone, Encodable, Decodable)]
pub struct RecoveryFile {
    /// Add some contant bytes to the beginning of the recovery file.
    /// This format allows potentially quick scanning looking for
    /// any recovery file on the file system.
    pub magic: [u8; 8],
    pub signing_sk: SerdeEncodable<secp256k1::SecretKey>,
    /// This is a copy of the backup encryption key, so the user can
    /// decrypt it's own backup, while even if the Federation colludes (is
    /// coorced to), they won't be able to access the backup (privacy
    /// protection).
    ///
    /// Raw bytes as `ring` which we use for symetric encryption doesn't seem to
    /// support anything better.
    pub encryption_key: [u8; 32],
    pub double_encrypted_seed: DoubleEncryptedData,
    pub verification_document: VerificationDocument,
}

impl RecoveryFile {
    pub const MAGIC_PREFIX: &[u8; 8] = b"\xFE\xD1RECOVE";

    pub fn to_bytes(&self) -> Vec<u8> {
        let mut bytes = Vec::new();
        Encodable::consensus_encode(self, &mut bytes).expect("encodes correctly");
        bytes
    }

    pub fn from_bytes(raw: &[u8]) -> anyhow::Result<Self> {
        Ok(Decodable::consensus_decode(
            &mut &raw[..],
            &ModuleDecoderRegistry::default(),
        )?)
    }
}

/// The state of recovery, that can be serialized and stored
#[derive(Encodable, Decodable, Clone, Debug, Serialize, Deserialize)]
pub struct SocialRecoveryState {
    pub signing_sk: SerdeEncodable<secp256k1::SecretKey>,
    pub encryption_key: [u8; 32],
    pub double_encrypted_seed: DoubleEncryptedData,
    pub recovery_session_decryption_key:
        SerdeEncodable<threshold_crypto::serde_impl::SerdeSecret<threshold_crypto::SecretKey>>,
    pub shares: BTreeMap<PeerId, SerdeEncodable<threshold_crypto::DecryptionShare>>,
}

impl SocialRecoveryState {
    pub fn new(recovery_file: RecoveryFile) -> Self {
        Self {
            recovery_session_decryption_key: SerdeEncodable(
                threshold_crypto::serde_impl::SerdeSecret(threshold_crypto::SecretKey::random()),
            ),
            signing_sk: recovery_file.signing_sk,
            encryption_key: recovery_file.encryption_key,
            double_encrypted_seed: recovery_file.double_encrypted_seed,
            shares: Default::default(),
        }
    }
}

#[derive(Debug, Decodable, Encodable)]
pub struct SocialRecoveryStateKey(pub FederationId);

#[derive(Debug, Decodable, Encodable)]
pub struct SocialRecoveryIdKey(pub FederationId);

// These two keys are defined in this crate using prefixes defined in v1-rocksdb
// because they use values from this crate which v1-rocksdb cannot import

impl fedimint_core::db::DatabaseRecord for SocialRecoveryStateKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::SocialRecoveryState as u8;
    type Key = Self;
    type Value = SocialRecoveryState;
}

impl fedimint_core::db::DatabaseRecord for SocialRecoveryIdKey {
    const DB_PREFIX: u8 = BridgeDbPrefix::SocialRecoveryId as u8;
    type Key = Self;
    type Value = RecoveryId;
}
