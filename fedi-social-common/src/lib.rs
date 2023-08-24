use config::FediSocialClientConfig;
use fedimint_core::core::{Decoder, ModuleInstanceId, ModuleKind};
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::{CommonModuleInit, ModuleCommon, ModuleConsensusVersion};
use fedimint_core::plugin_types_trait_impl_common;
use serde::{Deserialize, Serialize};

pub use crate::common::{
    BackupId, BackupRequest, EncryptedRecoveryShare, RecoveryId, RecoveryRequest,
    SignedBackupRequest,
};

pub mod config;

pub mod common;
pub mod db;

pub const KIND: ModuleKind = ModuleKind::from_static_str("fedi-social");
const VERSION: ModuleConsensusVersion = ModuleConsensusVersion(0);

#[derive(
    Debug, Clone, Eq, PartialEq, Hash, Deserialize, Serialize, Encodable, Decodable, Default,
)]
pub struct FediSocialInput;

impl std::fmt::Display for FediSocialInput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Fedi Social Input")
    }
}

#[derive(
    Debug, Clone, Eq, PartialEq, Hash, Deserialize, Serialize, Encodable, Decodable, Default,
)]
pub struct FediSocialOutput;

impl std::fmt::Display for FediSocialOutput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Fedi Social Output")
    }
}

#[derive(
    Debug, Clone, Eq, PartialEq, Hash, Deserialize, Serialize, Encodable, Decodable, Default,
)]
pub struct FediSocialOutputOutcome;

impl std::fmt::Display for FediSocialOutputOutcome {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Fedi Social OutputOutcome")
    }
}

#[derive(
    Debug, Clone, Eq, PartialEq, Hash, Deserialize, Serialize, Encodable, Decodable, Default,
)]
pub struct FediSocialConsensusItem;

impl std::fmt::Display for FediSocialConsensusItem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Fedi Social ConsensusItem")
    }
}

pub struct FediSocialModuleTypes;

#[derive(Debug)]
pub struct FediSocialCommonGen;

impl CommonModuleInit for FediSocialCommonGen {
    const CONSENSUS_VERSION: ModuleConsensusVersion = VERSION;
    const KIND: ModuleKind = KIND;

    type ClientConfig = FediSocialClientConfig;

    fn decoder() -> Decoder {
        FediSocialModuleTypes::decoder_builder().build()
    }
}

plugin_types_trait_impl_common!(
    FediSocialModuleTypes,
    FediSocialClientConfig,
    FediSocialInput,
    FediSocialOutput,
    FediSocialOutputOutcome,
    FediSocialConsensusItem
);
