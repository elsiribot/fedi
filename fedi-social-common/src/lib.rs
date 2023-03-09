use config::FediSocialClientConfig;
use fedimint_core::core::{Decoder, ModuleInstanceId, ModuleKind};
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::__reexports::serde_json;
use fedimint_core::module::{CommonModuleGen, ModuleCommon};
use fedimint_core::plugin_types_trait_impl_common;
use serde::{Deserialize, Serialize};

pub use crate::common::{
    BackupId, BackupRequest, EncryptedRecoveryShare, RecoveryId, RecoveryRequest,
    SignedBackupRequest,
};

pub mod config;

pub mod common;
pub mod db;

const KIND: ModuleKind = ModuleKind::from_static_str("fedi-social");

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

impl ModuleCommon for FediSocialModuleTypes {
    type Input = FediSocialInput;
    type Output = FediSocialOutput;
    type OutputOutcome = FediSocialOutputOutcome;
    type ConsensusItem = FediSocialConsensusItem;
}

#[derive(Debug)]
pub struct FediSocialCommonGen;

impl CommonModuleGen for FediSocialCommonGen {
    const KIND: ModuleKind = KIND;

    fn decoder() -> Decoder {
        FediSocialModuleTypes::decoder_builder().build()
    }

    fn hash_client_module(
        config: serde_json::Value,
    ) -> anyhow::Result<bitcoin_hashes::sha256::Hash> {
        serde_json::from_value::<FediSocialClientConfig>(config)?.consensus_hash()
    }
}

plugin_types_trait_impl_common!(
    FediSocialInput,
    FediSocialOutput,
    FediSocialOutputOutcome,
    FediSocialConsensusItem
);
