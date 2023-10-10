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

pub const KIND: ModuleKind = ModuleKind::from_static_str("stability_pool");
pub const CONSENSUS_VERSION: ModuleConsensusVersion = ModuleConsensusVersion(0);

/// Withdrawing unlocked funds from the stability pool is technically just a
/// fedimint transaction where the input comes from the stability pool module
/// and the output comes from the e-cash module.
///
/// A user's holdings inside the stability pool are distributed into 3
/// categories:
/// 1. Idle balance: these are funds that were recovered by canceling auto
///    renewal. They can be freely withdrawn.
/// 2. Staged balance: the sum of any staged seeks or provides that have not
///    been locked yet. They can be freely withdrawn.
/// 3. Locked balance: the sum of any locked seeks or provides. This is not a
///    realized amount, meaning it can fluctuate until the end of the cycle,
///    when the locks are settled and paid out. This amount cannot be withdrawn,
///    and the user must stage a cancellation so that when the cycle ends, a %
///    (could be 100%) of the final payout is moved to idle balance instead of
///    being re-staged and then re-locked.
///
/// The `amount` specified in the `StabilityPoolInput` must be less than or
/// equal to the user's total unlocked balance, which is defined as the sum of
/// idle balance and staged balance.
#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolInput {
    pub account: XOnlyPublicKey,
    pub amount: Amount,
}

/// Depositing funds into the stability pool is technically just a fedimint
/// transaction where the input comes from the e-cash module and the outputs
/// come from the stability pool module and the e-cash module (in case of any
/// change).
#[derive(Clone, Debug, Hash, PartialEq, Encodable, Decodable)]
pub struct StabilityPoolOutput {
    pub account: XOnlyPublicKey,
    pub intended_action: IntendedAction,
}

/// The user's intention behind the deposit must be specified using the
/// `IntendedAction` enum out of the following 4 options:
/// 1. `Seek`: means deposit the specified msat amount for staging a seek. A
///    seek is accepted iff the user does NOT already have staged provides,
///    locked provides, or staged cancellation. Seeks are assigned
///    auto-incrementing sequences by the guardians.
/// 2. `Provide`: means deposit the specified msat amount for staging a provide
///    with the specified min fee rate (in PPB). A provide is accepted iff the
///    user does NOT already have staged seeks, locked seeks, or staged
///    cancellation. Provides are assigned auto-incrementing sequences by the
///    guardians.
/// 3. `CancelRenewal`: means stage a cancellation for the specified %
///    (expressed in basis points) of the user's locked funds. This means that
///    when the current cycle ends, the specified portion of the user's position
///    is not auto-renewed, and is instead moved to their "idle balance" within
///    the stability pool, waiting to be claimed by them later in a transaction.
///    A % unit is used as it works for both seeks and provides (since provider
///    doesn't know either the msats or the $ value that they will receive when
///    the current cycle ends). A cancellation is accepted iff the user does NOT
///    have any staged seeks or provides or staged cancellation AND has at least
///    one locked seek or provide (but not both).
/// 4. `UndoCancelRenewal`: means cancel any staged cancellation because the
///    user changed their mind. Naturally the user must have a staged
///    cancellation.
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

/// The stability pool's contribution to consensus is minimal and contains only
/// the data needed to progress from one cycle to the next. The philosophy here
/// is to only include the bare minimum needed so that everything else can be
/// deterministically calculated by each guardian.
///
/// Guardians use the cycle duration (which is part of the consensus
/// configuration) to realize when the next cycle needs to begin. At that
/// moment, they query the oracle to get the latest BTC/USD
/// price, and propose a new consensus item using their system clock and the
/// index of the next cycle.
///
/// When other guardians receive these proposals and consensus items, they wait
/// to see a threshold number of votes before actually processing the cycle
/// turnover. Both the start time and the start price for the
/// turnover are obtained from median values among the votes.
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
