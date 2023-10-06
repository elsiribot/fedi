use std::fmt::{self, Display};
use std::time::SystemTime;

use bitcoin::XOnlyPublicKey;
use fedimint_core::core::{Decoder, ModuleKind};
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::module::registry::ModuleInstanceId;
use fedimint_core::module::{CommonModuleInit, ModuleCommon, ModuleConsensusVersion};
use fedimint_core::{plugin_types_trait_impl_common, Amount};
use serde::{Deserialize, Serialize};

pub mod config;
use config::StabilityPoolClientConfig;

pub mod oracle;

pub const KIND: ModuleKind = ModuleKind::from_static_str("stability_pool");
pub const CONSENSUS_VERSION: ModuleConsensusVersion = ModuleConsensusVersion(0);

#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolInput {
    pub account: XOnlyPublicKey,
    pub amount: Amount,
}

#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolOutput {
    pub account: XOnlyPublicKey,
    pub intended_action: IntendedAction,
}

#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub enum IntendedAction {
    Seek(Seek),
    Provide(Provide),
    CancelRenewal(CancelRenewal),
    UndoCancelRenewal,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct Seek(pub Amount);

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct Provide {
    pub amount: Amount,
    pub min_fee_rate: u64,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct CancelRenewal {
    pub bps: u32,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StagedSeek {
    pub sequence: u64,
    pub seek: Seek,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StagedProvide {
    pub sequence: u64,
    pub provide: Provide,
}

#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolOutputOutcome;

#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolConsensusItem {
    pub next_cycle_index: u64,
    pub time: SystemTime,
    pub price: u64,
}

pub struct StabilityPoolModuleTypes;

#[derive(Debug)]
pub struct StabilityPoolCommonGen;

impl CommonModuleInit for StabilityPoolCommonGen {
    const CONSENSUS_VERSION: ModuleConsensusVersion = CONSENSUS_VERSION;

    const KIND: ModuleKind = KIND;

    type ClientConfig = StabilityPoolClientConfig;

    fn decoder() -> Decoder {
        StabilityPoolModuleTypes::decoder_builder().build()
    }
}

plugin_types_trait_impl_common!(
    StabilityPoolModuleTypes,
    StabilityPoolClientConfig,
    StabilityPoolInput,
    StabilityPoolOutput,
    StabilityPoolOutputOutcome,
    StabilityPoolConsensusItem
);

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct LockedSeek {
    pub staged_sequence: u64,
    pub amount: Amount,
}

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct LockedProvide {
    pub staged_sequence: u64,
    pub staged_min_fee_rate: u64,
    pub amount: Amount,
}

impl Display for StabilityPoolInput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Input for account {} with amount {}",
            self.amount, self.account,
        )
    }
}

impl Display for StabilityPoolOutput {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Output for account {} to {}",
            self.account, self.intended_action,
        )
    }
}

impl Display for IntendedAction {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            IntendedAction::Seek(Seek(amount)) => write!(f, "seek for {amount}"),
            IntendedAction::Provide(Provide {
                amount,
                min_fee_rate,
            }) => write!(
                f,
                "provide for {amount} with min fee rate of {min_fee_rate}"
            ),
            IntendedAction::CancelRenewal(CancelRenewal { bps }) => {
                write!(f, "cancel renewal of {bps} BPS of currently locked funds")
            }
            IntendedAction::UndoCancelRenewal => write!(f, "undo cancellation of auto-renewal"),
        }
    }
}

impl Display for StabilityPoolOutputOutcome {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Output outcome is a unit struct",)
    }
}

impl Display for StabilityPoolConsensusItem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Consensus item with time {:?} and price {} in cents",
            self.time, self.price
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct SeekMetadata {
    pub initial_amount: Amount,
    pub initial_amount_cents: u64,
    pub withdrawn_amount: Amount,
    pub withdrawn_amount_cents: u64,
    pub fees_paid_so_far: Amount,
    pub first_lock_start_time: SystemTime,
}

impl Default for SeekMetadata {
    fn default() -> Self {
        SeekMetadata {
            initial_amount: Amount::ZERO,
            initial_amount_cents: 0,
            withdrawn_amount: Amount::ZERO,
            withdrawn_amount_cents: 0,
            fees_paid_so_far: Amount::ZERO,
            first_lock_start_time: SystemTime::now(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LockedSeekWithMetadata {
    pub lock: LockedSeek,
    pub metadata: SeekMetadata,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AccountInfo {
    pub idle_balance: Amount,
    pub staged_seeks: Vec<StagedSeek>,
    pub staged_provides: Vec<StagedProvide>,
    pub staged_cancellation: Option<CancelRenewal>,
    pub locked_seeks: Vec<LockedSeekWithMetadata>,
    pub locked_provides: Vec<LockedProvide>,
}
