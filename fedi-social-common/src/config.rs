use fedimint_core::config::{
    ClientModuleConfig, TypedClientModuleConfig, TypedServerModuleConfig,
    TypedServerModuleConsensusConfig,
};
use fedimint_core::core::ModuleKind;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::ModuleConsensusVersion;
use fedimint_core::PeerId;
use serde::{Deserialize, Serialize};

use crate::{KIND, VERSION};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SocialConfig {
    pub private: SocialPrivateConfig,
    pub consensus: FediSocialConsensusConfig,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SocialPrivateConfig {
    /// Our share of decryption key
    pub sk_share: threshold_crypto::serde_impl::SerdeSecret<threshold_crypto::SecretKeyShare>,
}

#[derive(Clone, Debug, Serialize, Deserialize, Encodable, Decodable)]
pub struct FediSocialConsensusConfig {
    pub pk_set: threshold_crypto::PublicKeySet,
    pub threshold: u32,
}

impl TypedServerModuleConsensusConfig for FediSocialConsensusConfig {
    fn kind(&self) -> ModuleKind {
        KIND
    }

    fn version(&self) -> ModuleConsensusVersion {
        VERSION
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, Encodable, Decodable)]
pub struct FediSocialClientConfig {
    pub federation_pk_set: threshold_crypto::PublicKeySet,
}

impl FediSocialClientConfig {
    /// Get the combined public key
    pub fn pk(&self) -> threshold_crypto::PublicKey {
        self.federation_pk_set.public_key()
    }
}

impl TypedClientModuleConfig for FediSocialClientConfig {
    fn kind(&self) -> ModuleKind {
        KIND
    }

    fn version(&self) -> ModuleConsensusVersion {
        VERSION
    }
}

impl TypedServerModuleConfig for SocialConfig {
    type Local = ();
    type Private = SocialPrivateConfig;
    type Consensus = FediSocialConsensusConfig;

    fn from_parts(_local: Self::Local, private: Self::Private, consensus: Self::Consensus) -> Self {
        Self { private, consensus }
    }

    fn to_parts(self) -> (ModuleKind, Self::Local, Self::Private, Self::Consensus) {
        (KIND, (), self.private, self.consensus)
    }
}
