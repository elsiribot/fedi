use std::collections::BTreeMap;
use std::time::SystemTime;

use bitcoin::XOnlyPublicKey;
use fedimint_core::encoding::{Decodable, Encodable};
use fedimint_core::{impl_db_lookup, impl_db_record, Amount, PeerId};
use stability_pool_common::{
    CancelRenewal, LockedProvide, LockedSeek, SeekMetadata, StabilityPoolConsensusItem,
    StagedProvide, StagedSeek,
};

#[repr(u8)]
#[derive(Clone, Debug)]
pub enum DbKeyPrefix {
    IdleBalance = 0x01,
    StagedSeeks,
    StagedProvides,
    StagedCancellation,
    CurrentCycle,
    PastCycle,
    StagedSeekSequence,
    StagedProvideSequence,
    CycleChangeVote,
    SeekMetadata,
}

#[derive(Debug, Encodable, Decodable)]
pub struct IdleBalanceKey(pub XOnlyPublicKey);

#[derive(Debug, Encodable, Decodable)]
pub struct IdleBalanceKeyPrefix;

#[derive(Debug, Encodable, Decodable)]
pub struct IdleBalance(pub Amount);

impl_db_record!(
    key = IdleBalanceKey,
    value = IdleBalance,
    db_prefix = DbKeyPrefix::IdleBalance,
);
impl_db_lookup!(key = IdleBalanceKey, query_prefix = IdleBalanceKeyPrefix);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedSeeksKey(pub XOnlyPublicKey);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedSeeksKeyPrefix;

impl_db_record!(key = StagedSeeksKey, value = Vec<StagedSeek>, db_prefix = DbKeyPrefix::StagedSeeks);
impl_db_lookup!(key = StagedSeeksKey, query_prefix = StagedSeeksKeyPrefix);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedProvidesKey(pub XOnlyPublicKey);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedProvidesKeyPrefix;

impl_db_record!(key = StagedProvidesKey, value = Vec<StagedProvide>, db_prefix = DbKeyPrefix::StagedProvides);
impl_db_lookup!(
    key = StagedProvidesKey,
    query_prefix = StagedProvidesKeyPrefix
);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedCancellationKey(pub XOnlyPublicKey);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedCancellationKeyPrefix;

impl_db_record!(
    key = StagedCancellationKey,
    value = CancelRenewal,
    db_prefix = DbKeyPrefix::StagedCancellation
);
impl_db_lookup!(
    key = StagedCancellationKey,
    query_prefix = StagedCancellationKeyPrefix
);

#[derive(Debug, Encodable, Decodable)]
pub struct Cycle {
    pub index: u64,
    pub start_time: SystemTime,
    pub start_price: u64,
    pub locked_seeks: BTreeMap<XOnlyPublicKey, Vec<LockedSeek>>,
    pub locked_provides: BTreeMap<XOnlyPublicKey, Vec<LockedProvide>>,
}

#[derive(Debug, Encodable, Decodable)]
pub struct CurrentCycleKey;

#[derive(Debug, Encodable, Decodable)]
pub struct CurrentCycleKeyPrefix;

impl_db_record!(
    key = CurrentCycleKey,
    value = Cycle,
    db_prefix = DbKeyPrefix::CurrentCycle
);
impl_db_lookup!(key = CurrentCycleKey, query_prefix = CurrentCycleKeyPrefix);

#[derive(Debug, Encodable, Decodable)]
pub struct PastCycleKey(pub u64);

#[derive(Debug, Encodable, Decodable)]
pub struct PastCycleKeyPrefix;

impl_db_record!(
    key = PastCycleKey,
    value = Cycle,
    db_prefix = DbKeyPrefix::PastCycle
);
impl_db_lookup!(key = PastCycleKey, query_prefix = PastCycleKeyPrefix);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedSeekSequenceKey;

#[derive(Debug, Encodable, Decodable)]
pub struct StagedSeekSequenceKeyPrefix;

impl_db_record!(
    key = StagedSeekSequenceKey,
    value = u64,
    db_prefix = DbKeyPrefix::StagedSeekSequence
);

impl_db_lookup!(
    key = StagedSeekSequenceKey,
    query_prefix = StagedSeekSequenceKeyPrefix,
);

#[derive(Debug, Encodable, Decodable)]
pub struct StagedProvideSequenceKey;

#[derive(Debug, Encodable, Decodable)]
pub struct StagedProvideSequenceKeyPrefix;

impl_db_record!(
    key = StagedProvideSequenceKey,
    value = u64,
    db_prefix = DbKeyPrefix::StagedProvideSequence
);

impl_db_lookup!(
    key = StagedProvideSequenceKey,
    query_prefix = StagedProvideSequenceKeyPrefix,
);

#[derive(Debug, Encodable, Decodable)]
pub struct CycleChangeVoteKey(pub u64, pub PeerId);

#[derive(Debug, Encodable, Decodable)]
pub struct CycleChangeVoteIndexPrefix(pub u64);

#[derive(Debug, Encodable, Decodable)]
pub struct CycleChangeVoteKeyPrefix;

impl_db_record!(
    key = CycleChangeVoteKey,
    value = StabilityPoolConsensusItem,
    db_prefix = DbKeyPrefix::CycleChangeVote
);

impl_db_lookup!(
    key = CycleChangeVoteKey,
    query_prefix = CycleChangeVoteIndexPrefix,
    query_prefix = CycleChangeVoteKeyPrefix,
);

#[derive(Debug, Encodable, Decodable)]
pub struct SeekMetadataKey(pub u64);

#[derive(Debug, Encodable, Decodable)]
pub struct SeekMetadataKeyPrefix;

impl_db_record!(
    key = SeekMetadataKey,
    value = SeekMetadata,
    db_prefix = DbKeyPrefix::SeekMetadata
);
impl_db_lookup!(key = SeekMetadataKey, query_prefix = SeekMetadataKeyPrefix);
