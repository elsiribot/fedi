use std::collections::{BTreeMap, BTreeSet};
use std::fmt::{self, Display};
use std::io;
use std::str::FromStr;
use std::time::SystemTime;

use anyhow::{bail, Context};
use bitcoin::bech32::{self, Bech32m, Hrp};
use bitcoin::hashes::sha256;
use fedimint_core::core::{Decoder, ModuleInstanceId, ModuleKind};
use fedimint_core::encoding::{Decodable, DecodeError, Encodable};
use fedimint_core::module::registry::ModuleDecoderRegistry;
use fedimint_core::module::{CommonModuleInit, ModuleCommon, ModuleConsensusVersion};
use fedimint_core::{
    extensible_associated_module_type, plugin_types_trait_impl_common, Amount, BitcoinHash,
    TransactionId,
};
use secp256k1::PublicKey;
use serde::de::Error as _;
use serde::{Deserialize, Serialize};

pub mod config;
use config::StabilityPoolClientConfig;

pub const KIND: ModuleKind = ModuleKind::from_static_str("multi_sig_stability_pool");
pub const CONSENSUS_VERSION: ModuleConsensusVersion = ModuleConsensusVersion::new(0, 0);

pub const MSATS_PER_BTC: u128 = 100_000_000_000;

/// Wrapper new-type for fiat-denominated amounts. The value is assumed to be
/// expressed in the real-world granularity of the specific fiat currency. For
/// example: cents (or hundredths) for most currencies. However some currencies
/// may be denominated only in whole units in the real world, such as JPY or KRW
/// or VND. As long as the base unit is consistent between client-server
/// interactions and the oracle, everything should "just work".
#[derive(
    Copy,
    Clone,
    Debug,
    Hash,
    Eq,
    PartialEq,
    Encodable,
    Decodable,
    Serialize,
    Deserialize,
    PartialOrd,
    Ord,
)]
pub struct FiatAmount(pub u64);

impl FiatAmount {
    pub fn from_btc_amount(
        btc_amount: Amount,
        price_per_btc: FiatAmount,
    ) -> anyhow::Result<FiatAmount> {
        // 1 BTC is worth price_per_btc FiatAmount
        // 1 BTC = 10^8 SATS = 10^11 MSATS
        // So 10^11 MSATS is worth price_per_btc FiatAmount
        // x MSATS is worth (price_per_btc * x) / 10^11 FiatAmount
        let price_times_amount = u128::from(price_per_btc.0) * u128::from(btc_amount.msats);
        let fiat = price_times_amount / MSATS_PER_BTC;

        // Since end result is an actual fiat value it should comfortably fit in u64
        Ok(FiatAmount(fiat.try_into()?))
    }

    pub fn to_btc_amount(&self, price_per_btc: FiatAmount) -> anyhow::Result<Amount> {
        let fiat_amount = self;
        // price_per_btc FiatAmount is worth 1 BTC
        // 1 BTC = 10^8 SATS = 10^11 MSATS
        // So price_per_btc FiatAmount is worth 10^11 MSATS
        // fiat_amount FiatAmount is worth (fiat_amount * 10^11) / price_per_btc MSATS
        let fiat_amount_times_exp = u128::from(fiat_amount.0) * MSATS_PER_BTC;
        let msats = fiat_amount_times_exp / u128::from(price_per_btc.0);

        // Since end result is an msat value it should comfortably fit in u64
        Ok(Amount::from_msats(msats.try_into()?))
    }
}

/// An account may only act as a seeker or as a provider but not both at the
/// same time.
#[derive(
    Copy,
    Clone,
    Debug,
    Hash,
    Eq,
    PartialEq,
    Encodable,
    Decodable,
    Serialize,
    Deserialize,
    PartialOrd,
    Ord,
)]
pub enum AccountType {
    Seeker,
    Provider,
}

/// `Account` within the stability pool is represented as a naive multi-sig of
/// pub keys + threshold. Within the DB, keys are the hashes of `Account`
/// (represented by AccountId). However, whenever we wish to modify an account's
/// state, the client must provide the full `Account` struct so that we can
/// verify that the hash matches.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Encodable, Serialize)]
pub struct Account {
    acc_type: AccountType,
    // invariant: length > 0
    pub_keys: BTreeSet<PublicKey>,
    // invariant: 0 < threshold < keys.length
    threshold: u64,
}

/// Account without invariants that can be checked using try_into.
#[derive(Decodable, Deserialize)]
struct AccountUnchecked {
    acc_type: AccountType,
    pub_keys: BTreeSet<PublicKey>,
    threshold: u64,
}

impl TryFrom<AccountUnchecked> for Account {
    type Error = anyhow::Error;
    fn try_from(raw: AccountUnchecked) -> anyhow::Result<Account> {
        if raw.threshold > raw.pub_keys.len().try_into().expect("usize to fit in u64")
            || raw.threshold == 0
            || raw.pub_keys.is_empty()
        {
            bail!("invalid account");
        }
        Ok(Account {
            acc_type: raw.acc_type,
            pub_keys: raw.pub_keys,
            threshold: raw.threshold,
        })
    }
}

impl Decodable for Account {
    fn consensus_decode<R: io::Read>(
        r: &mut R,
        modules: &ModuleDecoderRegistry,
    ) -> Result<Self, DecodeError> {
        let raw = AccountUnchecked::consensus_decode(r, modules)?;
        Ok(raw.try_into()?)
    }
}

impl<'de> Deserialize<'de> for Account {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let raw = AccountUnchecked::deserialize(deserializer)?;
        raw.try_into().map_err(D::Error::custom)
    }
}

#[derive(
    Copy,
    Clone,
    Debug,
    Hash,
    Eq,
    PartialEq,
    Deserialize,
    Serialize,
    Encodable,
    Decodable,
    PartialOrd,
    Ord,
)]
pub struct AccountId {
    acc_type: AccountType,
    hash: sha256::Hash,
}

impl Account {
    pub fn id(&self) -> AccountId {
        AccountId {
            acc_type: self.acc_type,
            hash: self.consensus_hash(),
        }
    }

    pub fn single(key: PublicKey, acc_type: AccountType) -> Self {
        Self {
            acc_type,
            pub_keys: BTreeSet::from([key]),
            threshold: 1,
        }
    }

    pub fn as_single(&self) -> Option<&PublicKey> {
        if self.pub_keys.len() == 1 && self.threshold == 1 {
            Some(self.pub_keys.first().expect("length checked above"))
        } else {
            None
        }
    }

    pub fn acc_type(&self) -> AccountType {
        self.acc_type
    }
}

impl AccountId {
    pub fn acc_type(&self) -> AccountType {
        self.acc_type
    }
}

pub const SEEKER_HRP: Hrp = Hrp::parse_unchecked("sps");
pub const PROVIDER_HRP: Hrp = Hrp::parse_unchecked("spp");

impl Display for AccountId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let hrp = match self.acc_type {
            AccountType::Seeker => SEEKER_HRP,
            AccountType::Provider => PROVIDER_HRP,
        };
        let encoded = bech32::encode::<Bech32m>(hrp, self.hash.as_ref()).map_err(|_| fmt::Error)?;
        write!(f, "{}", encoded)
    }
}

impl FromStr for AccountId {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let (hrp, data) = bech32::decode(s)?;

        let acc_type = if hrp.as_str() == SEEKER_HRP.as_str() {
            AccountType::Seeker
        } else if hrp.as_str() == PROVIDER_HRP.as_str() {
            AccountType::Provider
        } else {
            bail!("Invalid account type");
        };

        let hash = sha256::Hash::from_slice(&data).context("Invalid data")?;

        Ok(AccountId { acc_type, hash })
    }
}

/// Withdrawal is a 2-step process whereby the first step is the client telling
/// the server to free up X cents in the idle balance, and second step is the
/// client then sweeping up the idle balance.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub enum StabilityPoolInputV0 {
    UnlockForWithdrawal(UnlockForWithdrawalInput),
    Withdrawal(WithdrawalInput),
}

impl StabilityPoolInputV0 {
    pub fn account(&self) -> Account {
        match self {
            StabilityPoolInputV0::UnlockForWithdrawal(unlock) => unlock.account.clone(),
            StabilityPoolInputV0::Withdrawal(withdrawal) => withdrawal.account.clone(),
        }
    }
}

/// UnlockForWithdrawalInput allows telling the server to set aside msats (in
/// idle balance) for the given amount of fiat (or ALL) so that the entire
/// msats might be withdrawn in a subsequent transaction.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub struct UnlockForWithdrawalInput {
    pub account: Account,
    pub amount: UnlockForWithdrawalAmount,
}

/// Request unlocking of the given FiatAmount, or ALL of the account's holdings.
#[derive(Copy, Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub enum UnlockForWithdrawalAmount {
    Fiat(FiatAmount),
    All,
}

/// WithdrawalInput allows withdrawing the given amount of msats. Typically this
/// is the second step in a withdrawal operation.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub struct WithdrawalInput {
    pub account: Account,
    pub amount: Amount,
}

extensible_associated_module_type!(
    StabilityPoolInput,
    StabilityPoolInputV0,
    UnknownStabilityPoolInputVariantError
);

/// Depositing funds into the stability pool can be the purpose of seeking or
/// providing. In both these cases, the funds (input) are coming from the e-cash
/// module.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub enum StabilityPoolOutputV0 {
    DepositToSeek(DepositToSeekOutput),
    DepositToProvide(DepositToProvideOutput),
}

/// Represents a module output for depositing the given `amount` into the given
/// `account_id`s staging balance as a seek. Seeks are assigned
/// auto-incrementing sequences by the guardians.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub struct DepositToSeekOutput {
    pub account_id: AccountId,
    pub seek: Seek,
}

/// Represents a module output for depositing the given `amount` into the given
/// `account_id`s staging balance as a provide with the specified `min_fee_rate`
/// in parts-per-billion. Provides are assigned auto-incrementing sequences by
/// the guardians.
#[derive(Clone, Debug, Hash, Eq, PartialEq, Deserialize, Serialize, Encodable, Decodable)]
pub struct DepositToProvideOutput {
    pub account_id: AccountId,
    pub provide: Provide,
}

extensible_associated_module_type!(
    StabilityPoolOutput,
    StabilityPoolOutputV0,
    UnknownStabilityPoolOutputVariantError
);

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct Seek(pub Amount);

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct Provide {
    pub amount: Amount,
    pub min_fee_rate: u64,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StagedSeek {
    pub deposit: Deposit,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StagedProvide {
    pub deposit: Deposit,
    pub min_fee_rate: u64,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StabilityPoolOutputOutcomeV0;

extensible_associated_module_type!(
    StabilityPoolOutputOutcome,
    StabilityPoolOutputOutcomeV0,
    UnknownStabilityPoolOutputOutcomeVariantError
);

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
#[derive(Clone, Debug, Hash, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct StabilityPoolConsensusItemV0 {
    pub next_cycle_index: u64,
    pub time: SystemTime,
    pub price: FiatAmount,
}

extensible_associated_module_type!(
    StabilityPoolConsensusItem,
    StabilityPoolConsensusItemV0,
    UnknownStabilityPoolConsensusItemVariantError
);

impl StabilityPoolConsensusItem {
    pub fn new_v0(
        next_cycle_index: u64,
        time: SystemTime,
        price: FiatAmount,
    ) -> StabilityPoolConsensusItem {
        StabilityPoolConsensusItem::V0(StabilityPoolConsensusItemV0 {
            next_cycle_index,
            time,
            price,
        })
    }

    pub fn next_cycle_index(&self) -> anyhow::Result<u64> {
        match self {
            StabilityPoolConsensusItem::V0(StabilityPoolConsensusItemV0 {
                next_cycle_index,
                ..
            }) => Ok(*next_cycle_index),
            StabilityPoolConsensusItem::Default { variant, .. } => {
                bail!("Unsupported variant {variant}")
            }
        }
    }

    pub fn time(&self) -> anyhow::Result<SystemTime> {
        match self {
            StabilityPoolConsensusItem::V0(StabilityPoolConsensusItemV0 { time, .. }) => Ok(*time),
            StabilityPoolConsensusItem::Default { variant, .. } => {
                bail!("Unsupported variant {variant}")
            }
        }
    }

    pub fn price(&self) -> anyhow::Result<FiatAmount> {
        match self {
            StabilityPoolConsensusItem::V0(StabilityPoolConsensusItemV0 { price, .. }) => {
                Ok(*price)
            }
            StabilityPoolConsensusItem::Default { variant, .. } => {
                bail!("Unsupported variant {variant}")
            }
        }
    }
}

/// Errors that might be returned by the server when using an input from the
/// stability pool module.
#[derive(thiserror::Error, Debug, Clone, Eq, PartialEq, Hash, Encodable, Decodable)]
pub enum StabilityPoolInputError {
    #[error("Withdrawal amount is either 0 or not enough to cover fees.")]
    InvalidWithdrawalAmount,
    #[error("Sum of idle and staged balance is not enough to satisfy withdrawal request.")]
    InsufficientBalance,
    #[error("Multi-sig keys are not allowed for this operation.")]
    MultiSigNotAllowed,
    #[error("Temporary error, please try again later.")]
    TemporaryError,
    #[error("Previous unlock request must be completed before a new one can be accepted")]
    DuplicateUnlockRequest,
    #[error("{0}")]
    UnknownInputVariant(String),
}

/// Errors that might be returned by the server when using an output from the
/// stability pool module.
#[derive(thiserror::Error, Debug, Clone, Eq, PartialEq, Hash, Encodable, Decodable)]
pub enum StabilityPoolOutputError {
    #[error("Previous action must be fully processed before accepting new action.")]
    PreviousIntentionNotFullyProcessed,
    #[error("Cannot seek while staged/locked provides or cancellation are active.")]
    CannotSeek,
    #[error("Cannot provide while staged/locked seeks or cancellation are active.")]
    CannotProvide,
    #[error("Seeker account type cannot provide, and provider account type cannot seek")]
    InvalidAccountTypeForOperation,
    #[error("Cannot seek or provide when auto-renewal cancellation is already staged.")]
    AutoRenewalCancellationAlreadyStaged,
    #[error("Seek or provide amount is below minimum required amount.")]
    AmountTooLow,
    #[error("Provide fee rate is higher than maximum allowed by federation.")]
    FeeRateTooHigh,
    #[error("No active locks, or other staged actions present that must first be removed.")]
    CannotCancelAutoRenewal,
    #[error("Basis point value must be between 100 and 10,000.")]
    InvalidBPSForCancelAutoRenewal,
    #[error("No active request to cancel auto renewal.")]
    CannotUndoAutoRenewalCancellation,
    #[error("{0}")]
    UnknownOutputVariant(String),
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
    KIND,
    StabilityPoolModuleTypes,
    StabilityPoolClientConfig,
    StabilityPoolInput,
    StabilityPoolOutput,
    StabilityPoolOutputOutcome,
    StabilityPoolConsensusItem,
    StabilityPoolInputError,
    StabilityPoolOutputError
);

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct LockedSeek {
    pub deposit: Deposit,
}

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize, Hash)]
pub struct Deposit {
    pub txid: TransactionId,
    pub sequence: u64,
    pub amount: Amount,
}

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct LockedProvide {
    pub deposit: Deposit,
    pub min_fee_rate: u64,
}

impl Display for StabilityPoolInputV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StabilityPoolInputV0::UnlockForWithdrawal(unlock) => write!(
                f,
                "Input to unlock {} fiat amount from account {}",
                match unlock.amount {
                    UnlockForWithdrawalAmount::Fiat(fiat) => fiat.0.to_string(),
                    UnlockForWithdrawalAmount::All => "all".to_string(),
                },
                unlock.account.id(),
            ),
            StabilityPoolInputV0::Withdrawal(withdrawal) => {
                write!(
                    f,
                    "Input to withdraw {} from account {}",
                    withdrawal.amount,
                    withdrawal.account.id()
                )
            }
        }
    }
}

impl Display for StabilityPoolOutputV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StabilityPoolOutputV0::DepositToSeek(seek_output) => write!(
                f,
                "Deposit {} into account {} for seeking",
                seek_output.seek.0, seek_output.account_id
            ),
            StabilityPoolOutputV0::DepositToProvide(provide_output) => write!(
                f,
                "Deposit {} into account {} for providing with min fee rate {}",
                provide_output.provide.amount,
                provide_output.account_id,
                provide_output.provide.min_fee_rate
            ),
        }
    }
}

impl Display for StabilityPoolOutputOutcomeV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Output outcome is a unit struct",)
    }
}

impl Display for StabilityPoolConsensusItemV0 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Consensus item for cycle index {:?} with time {:?} and price {}",
            self.next_cycle_index, self.time, self.price.0
        )
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Encodable, Decodable, Serialize, Deserialize)]
pub struct SeekMetadata {
    pub staged_sequence: u64,
    pub initial_amount: Amount,
    pub initial_fiat_amount: FiatAmount,
    pub withdrawn_amount: Amount,
    pub withdrawn_fiat_amount: FiatAmount,
    pub fees_paid_so_far: Amount,
    pub first_lock_start_time: SystemTime,
    pub fully_withdrawn: bool,
}

impl Default for SeekMetadata {
    fn default() -> Self {
        SeekMetadata {
            staged_sequence: 0,
            initial_amount: Amount::ZERO,
            initial_fiat_amount: FiatAmount(0),
            withdrawn_amount: Amount::ZERO,
            withdrawn_fiat_amount: FiatAmount(0),
            fees_paid_so_far: Amount::ZERO,
            first_lock_start_time: fedimint_core::time::now(),
            fully_withdrawn: false,
        }
    }
}

/// After submitting the TX to unlock funds, clients will query the server for
/// the status of the unlock request. Since we have decided that there can only
/// be one at most 1 active unlock request at a time, there are two possible
/// statuses:
/// - Pending: the request hasn't been fully processed yet, meaning the cycle
///   turnover hasn't yet happened. In this case we respond to the client with
///   the start time of the next cycle so the client can sleep until the next
///   cycle and then retry.
/// - NoActiveRequest: the request is no longer present on the server.
///   Theoretically, this could mean one of three things:
///   1. An unlock request was never submitted in a TX (or the TX was rejected).
///   2. The unlock request was able to be immediately satisfied using staged
///      balance only.
///   3. The unlock request was registered to be processed at the next cycle
///      turnover, and that has already happened.
///
/// (1) is rather unlikely, as the client will start the withdrawal flow with an
/// unlock request TX, and should that TX fail, it will not attempt to
/// query the unlock request status. For both (2) and (3), the client only
/// needs to know the amount that can now be swept from idle balance. Even
/// though the client can query for the idle balance separately, we just
/// return it within the status to save the client an extra API call.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum UnlockRequestStatus {
    Pending { next_cycle_start_time: SystemTime },
    NoActiveRequest { idle_balance: Amount },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Encodable, Decodable)]
pub struct AccountInfo {
    pub idle_balance: Amount,
    pub staged_seeks: Vec<StagedSeek>,
    pub staged_provides: Vec<StagedProvide>,
    pub unlock_request: Option<UnlockForWithdrawalAmount>,
    pub locked_seeks: Vec<LockedSeek>,
    pub locked_provides: Vec<LockedProvide>,
    pub seeks_metadata: BTreeMap<TransactionId, SeekMetadata>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Encodable, Decodable)]
pub struct LiquidityStats {
    pub locked_seeks_sum_msat: u64,
    pub locked_provides_sum_msat: u64,
    pub staged_seeks_sum_msat: u64,
    pub staged_provides_sum_msat: u64,
}
