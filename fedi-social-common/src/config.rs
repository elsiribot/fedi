use fedimint_core::config::EmptyGenParams;
use fedimint_core::core::ModuleKind;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::plugin_types_trait_impl_config;
use serde::{Deserialize, Serialize};

use crate::FediSocialCommonGen;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediSocialConfig {
    pub private: FediSocialPrivateConfig,
    pub consensus: FediSocialConsensusConfig,
    pub local: FediSocialConfigLocal,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediSocialPrivateConfig {
    /// Our share of decryption key
    pub sk_share: threshold_crypto::serde_impl::SerdeSecret<threshold_crypto::SecretKeyShare>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Encodable, Decodable)]
pub struct FediSocialConsensusConfig {
    pub pk_set: threshold_crypto::PublicKeySet,
    pub threshold: u32,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, Encodable, Decodable)]
pub struct FediSocialClientConfig {
    pub federation_pk_set: threshold_crypto::PublicKeySet,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediSocialConfigLocal;

impl FediSocialClientConfig {
    /// Get the combined public key
    pub fn pk(&self) -> threshold_crypto::PublicKey {
        self.federation_pk_set.public_key()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FediSocialGenParams {
    consensus: EmptyGenParams,
    local: EmptyGenParams,
}

impl FediSocialGenParams {
    pub fn new() -> Self {
        Self {
            consensus: EmptyGenParams {},
            local: EmptyGenParams {},
        }
    }
}

plugin_types_trait_impl_config!(
    FediSocialCommonGen,
    FediSocialGenParams,
    EmptyGenParams,
    EmptyGenParams,
    FediSocialConfig,
    FediSocialConfigLocal,
    FediSocialPrivateConfig,
    FediSocialConsensusConfig,
    FediSocialClientConfig
);
