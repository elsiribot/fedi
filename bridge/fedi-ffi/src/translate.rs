use std::collections::BTreeMap;
use std::str::FromStr;

use fedimint_core::util::SafeUrl;
use fedimint_core::{BitcoinHash, TransactionId};

pub trait Translate<T> {
    fn translate(self) -> T;
}

pub trait NeedTranslation {}

impl<T: NeedTranslation> Translate<T> for T {
    fn translate(self) -> T {
        self
    }
}
impl<T1, T2, E1, E2> Translate<Result<T1, E1>> for Result<T2, E2>
where
    T2: Translate<T1>,
    E2: Translate<E1>,
{
    fn translate(self) -> Result<T1, E1> {
        self.map(Translate::translate).map_err(Translate::translate)
    }
}

impl<T1, T2: Translate<T1>> Translate<Option<T1>> for Option<T2> {
    fn translate(self) -> Option<T1> {
        self.map(Translate::translate)
    }
}

impl<T1, T2: Translate<T1>> Translate<Vec<T1>> for Vec<T2> {
    fn translate(self) -> Vec<T1> {
        self.into_iter().map(Translate::translate).collect()
    }
}

impl<T1, T2, U1, U2> Translate<(T1, U1)> for (T2, U2)
where
    T2: Translate<T1>,
    U2: Translate<U1>,
{
    fn translate(self) -> (T1, U1) {
        (self.0.translate(), self.1.translate())
    }
}

impl<K1, K2, V1, V2> Translate<BTreeMap<K1, V1>> for BTreeMap<K2, V2>
where
    K2: Translate<K1>,
    V2: Translate<V1>,
    K1: Ord,
{
    fn translate(self) -> BTreeMap<K1, V1> {
        self.into_iter().map(Translate::translate).collect()
    }
}

impl NeedTranslation for String {}
impl NeedTranslation for () {}
impl NeedTranslation for anyhow::Error {}

impl Translate<fedimint_core_v0::config::FederationId> for fedimint_core_v1::config::FederationId {
    fn translate(self) -> fedimint_core_v0::config::FederationId {
        fedimint_core_v0::config::FederationId(
            threshold_crypto::PublicKey::from_bytes(self.0.to_bytes())
                .expect("threshold_crypto::PublicKey bytes must be stable"),
        )
    }
}

impl Translate<fedimint_core::config::GlobalClientConfig>
    for fedimint_core_v1::config::GlobalClientConfig
{
    fn translate(self) -> fedimint_core::config::GlobalClientConfig {
        fedimint_core::config::GlobalClientConfig {
            api_endpoints: self
                .api_endpoints
                .into_iter()
                .map(|(peer_id, peer_url)| (peer_id.translate(), peer_url.translate()))
                .collect(),
            consensus_version: fedimint_core::module::CoreConsensusVersion {
                major: self.consensus_version.0,
                // FIXME: is hard-coding this ok?
                minor: 0,
            },
            meta: self.meta,
        }
    }
}

impl Translate<fedimint_core::config::JsonWithKind> for fedimint_core_v1::config::JsonWithKind {
    fn translate(self) -> fedimint_core::config::JsonWithKind {
        fedimint_core::config::JsonWithKind::new(
            fedimint_core::core::ModuleKind::clone_from_str(self.kind().as_str()),
            self.value().to_owned(),
        )
    }
}

impl Translate<fedimint_core::Amount> for fedimint_core_v0::Amount {
    fn translate(self) -> fedimint_core::Amount {
        fedimint_core::msats(self.msats)
    }
}

impl Translate<fedimint_core::Amount> for fedimint_core_v1::Amount {
    fn translate(self) -> fedimint_core::Amount {
        fedimint_core::msats(self.msats)
    }
}

impl Translate<fedimint_core_v1::Amount> for fedimint_core::Amount {
    fn translate(self) -> fedimint_core_v1::Amount {
        fedimint_core_v1::msats(self.msats)
    }
}

impl Translate<fedimint_core_v0::Amount> for fedimint_core::Amount {
    fn translate(self) -> fedimint_core_v0::Amount {
        fedimint_core_v0::msats(self.msats)
    }
}

impl Translate<fedimint_core::config::PeerUrl> for fedimint_core_v1::config::PeerUrl {
    fn translate(self) -> fedimint_core::config::PeerUrl {
        fedimint_core::config::PeerUrl {
            url: SafeUrl::from_str(self.url.as_str())
                .expect("Url -> SafeUrl translation cannot fail"),
            name: self.name.clone(),
        }
    }
}

impl Translate<fedimint_core::config::PeerUrl> for fedimint_core_v0::config::PeerUrl {
    fn translate(self) -> fedimint_core::config::PeerUrl {
        fedimint_core::config::PeerUrl {
            url: SafeUrl::from_str(self.url.as_str())
                .expect("Url -> SafeUrl translation cannot fail"),
            name: self.name.clone(),
        }
    }
}

impl Translate<fedimint_core_v1::config::PeerUrl> for fedimint_core_v0::config::PeerUrl {
    fn translate(self) -> fedimint_core_v1::config::PeerUrl {
        fedimint_core_v1::config::PeerUrl {
            url: self.url.clone(),
            name: self.name.clone(),
        }
    }
}

impl Translate<fedimint_core::PeerId> for fedimint_core_v1::PeerId {
    fn translate(self) -> fedimint_core::PeerId {
        fedimint_core::PeerId::from(self.to_usize() as u16)
    }
}

impl Translate<fedimint_core_v1::PeerId> for fedimint_core::PeerId {
    fn translate(self) -> fedimint_core_v1::PeerId {
        fedimint_core_v1::PeerId::from(self.to_usize() as u16)
    }
}

impl Translate<fedimint_core::PeerId> for fedimint_core_v0::PeerId {
    fn translate(self) -> fedimint_core::PeerId {
        fedimint_core::PeerId::from(self.to_usize() as u16)
    }
}

impl Translate<fedimint_ln_client::receive::LightningReceiveError>
    for fedimint_ln_client_v0::receive::LightningReceiveError
{
    fn translate(self) -> fedimint_ln_client::receive::LightningReceiveError {
        match self {
            fedimint_ln_client_v0::receive::LightningReceiveError::Rejected => {
                fedimint_ln_client::receive::LightningReceiveError::Rejected
            }
            fedimint_ln_client_v0::receive::LightningReceiveError::Timeout => {
                fedimint_ln_client::receive::LightningReceiveError::Timeout
            }
            fedimint_ln_client_v0::receive::LightningReceiveError::ClaimRejected => {
                fedimint_ln_client::receive::LightningReceiveError::ClaimRejected
            }
            fedimint_ln_client_v0::receive::LightningReceiveError::InvalidPreimage => {
                fedimint_ln_client::receive::LightningReceiveError::InvalidPreimage
            }
        }
    }
}
impl Translate<fedimint_ln_client::LnReceiveState> for fedimint_ln_client_v0::LnReceiveState {
    fn translate(self) -> fedimint_ln_client::LnReceiveState {
        match self {
            fedimint_ln_client_v0::LnReceiveState::Created => {
                fedimint_ln_client::LnReceiveState::Created
            }
            fedimint_ln_client_v0::LnReceiveState::WaitingForPayment { invoice, timeout } => {
                fedimint_ln_client::LnReceiveState::WaitingForPayment { invoice, timeout }
            }
            fedimint_ln_client_v0::LnReceiveState::Canceled { reason } => {
                fedimint_ln_client::LnReceiveState::Canceled {
                    reason: reason.translate(),
                }
            }
            fedimint_ln_client_v0::LnReceiveState::Funded => {
                fedimint_ln_client::LnReceiveState::Funded
            }
            fedimint_ln_client_v0::LnReceiveState::AwaitingFunds => {
                fedimint_ln_client::LnReceiveState::AwaitingFunds
            }
            fedimint_ln_client_v0::LnReceiveState::Claimed => {
                fedimint_ln_client::LnReceiveState::Claimed
            }
        }
    }
}

impl Translate<fedimint_ln_client::receive::LightningReceiveError>
    for fedimint_ln_client_v1::receive::LightningReceiveError
{
    fn translate(self) -> fedimint_ln_client::receive::LightningReceiveError {
        match self {
            fedimint_ln_client_v1::receive::LightningReceiveError::Rejected => {
                fedimint_ln_client::receive::LightningReceiveError::Rejected
            }
            fedimint_ln_client_v1::receive::LightningReceiveError::Timeout => {
                fedimint_ln_client::receive::LightningReceiveError::Timeout
            }
            fedimint_ln_client_v1::receive::LightningReceiveError::ClaimRejected => {
                fedimint_ln_client::receive::LightningReceiveError::ClaimRejected
            }
            fedimint_ln_client_v1::receive::LightningReceiveError::InvalidPreimage => {
                fedimint_ln_client::receive::LightningReceiveError::InvalidPreimage
            }
        }
    }
}
impl Translate<fedimint_ln_client::LnReceiveState> for fedimint_ln_client_v1::LnReceiveState {
    fn translate(self) -> fedimint_ln_client::LnReceiveState {
        match self {
            fedimint_ln_client_v1::LnReceiveState::Created => {
                fedimint_ln_client::LnReceiveState::Created
            }
            fedimint_ln_client_v1::LnReceiveState::WaitingForPayment { invoice, timeout } => {
                fedimint_ln_client::LnReceiveState::WaitingForPayment { invoice, timeout }
            }
            fedimint_ln_client_v1::LnReceiveState::Canceled { reason } => {
                fedimint_ln_client::LnReceiveState::Canceled {
                    reason: reason.translate(),
                }
            }
            fedimint_ln_client_v1::LnReceiveState::Funded => {
                fedimint_ln_client::LnReceiveState::Funded
            }
            fedimint_ln_client_v1::LnReceiveState::AwaitingFunds => {
                fedimint_ln_client::LnReceiveState::AwaitingFunds
            }
            fedimint_ln_client_v1::LnReceiveState::Claimed => {
                fedimint_ln_client::LnReceiveState::Claimed
            }
        }
    }
}

impl Translate<fedimint_ln_client::pay::GatewayPayError>
    for fedimint_ln_client_v1::pay::GatewayPayError
{
    fn translate(self) -> fedimint_ln_client::pay::GatewayPayError {
        match self {
            fedimint_ln_client_v1::pay::GatewayPayError::GatewayInternalError {
                error_code,
                error_message,
            } => fedimint_ln_client::pay::GatewayPayError::GatewayInternalError {
                error_code,
                error_message,
            },
            fedimint_ln_client_v1::pay::GatewayPayError::OutgoingContractError => {
                fedimint_ln_client::pay::GatewayPayError::OutgoingContractError
            }
        }
    }
}

impl Translate<fedimint_ln_client::pay::GatewayPayError>
    for fedimint_ln_client_v0::pay::GatewayPayError
{
    fn translate(self) -> fedimint_ln_client::pay::GatewayPayError {
        match self {
            fedimint_ln_client_v0::pay::GatewayPayError::GatewayInternalError {
                error_code,
                error_message,
            } => fedimint_ln_client::pay::GatewayPayError::GatewayInternalError {
                error_code,
                error_message,
            },
            fedimint_ln_client_v0::pay::GatewayPayError::OutgoingContractError => {
                fedimint_ln_client::pay::GatewayPayError::OutgoingContractError
            }
        }
    }
}

impl Translate<fedimint_ln_client::LnPayState> for fedimint_ln_client_v0::LnPayState {
    fn translate(self) -> fedimint_ln_client::LnPayState {
        match self {
            fedimint_ln_client_v0::LnPayState::Created => fedimint_ln_client::LnPayState::Created,
            fedimint_ln_client_v0::LnPayState::Canceled => fedimint_ln_client::LnPayState::Canceled,
            fedimint_ln_client_v0::LnPayState::Funded => fedimint_ln_client::LnPayState::Funded,
            fedimint_ln_client_v0::LnPayState::WaitingForRefund {
                block_height,
                gateway_error,
            } => fedimint_ln_client::LnPayState::WaitingForRefund {
                block_height,
                gateway_error: gateway_error.translate(),
            },
            fedimint_ln_client_v0::LnPayState::AwaitingChange => {
                fedimint_ln_client::LnPayState::AwaitingChange
            }
            fedimint_ln_client_v0::LnPayState::Success { preimage } => {
                fedimint_ln_client::LnPayState::Success { preimage }
            }
            fedimint_ln_client_v0::LnPayState::Refunded { gateway_error } => {
                fedimint_ln_client::LnPayState::Refunded {
                    gateway_error: gateway_error.translate(),
                }
            }
            fedimint_ln_client_v0::LnPayState::Failed => {
                fedimint_ln_client::LnPayState::UnexpectedError {
                    error_message: "Failed".to_string(),
                }
            }
        }
    }
}

impl Translate<fedimint_ln_client::LnPayState> for fedimint_ln_client_v1::LnPayState {
    fn translate(self) -> fedimint_ln_client::LnPayState {
        match self {
            fedimint_ln_client_v1::LnPayState::Created => fedimint_ln_client::LnPayState::Created,
            fedimint_ln_client_v1::LnPayState::Canceled => fedimint_ln_client::LnPayState::Canceled,
            fedimint_ln_client_v1::LnPayState::Funded => fedimint_ln_client::LnPayState::Funded,
            fedimint_ln_client_v1::LnPayState::WaitingForRefund {
                block_height,
                gateway_error,
            } => fedimint_ln_client::LnPayState::WaitingForRefund {
                block_height,
                gateway_error: gateway_error.translate(),
            },
            fedimint_ln_client_v1::LnPayState::AwaitingChange => {
                fedimint_ln_client::LnPayState::AwaitingChange
            }
            fedimint_ln_client_v1::LnPayState::Success { preimage } => {
                fedimint_ln_client::LnPayState::Success { preimage }
            }
            fedimint_ln_client_v1::LnPayState::Refunded { gateway_error } => {
                fedimint_ln_client::LnPayState::Refunded {
                    gateway_error: gateway_error.translate(),
                }
            }
            fedimint_ln_client_v1::LnPayState::UnexpectedError { error_message } => {
                fedimint_ln_client::LnPayState::UnexpectedError { error_message }
            }
        }
    }
}

impl Translate<lightning_invoice::Bolt11Invoice> for lightning_invoice_v1::Invoice {
    fn translate(self) -> lightning_invoice::Bolt11Invoice {
        lightning_invoice::Bolt11Invoice::from_str(&self.to_string())
            .expect("already valid invoice")
    }
}
impl Translate<lightning_invoice_v1::Invoice> for lightning_invoice::Bolt11Invoice {
    fn translate(self) -> lightning_invoice_v1::Invoice {
        lightning_invoice_v1::Invoice::from_str(&self.to_string()).expect("already valid invoice")
    }
}

impl Translate<fedimint_core::core::OperationId> for fedimint_client_v1::sm::OperationId {
    fn translate(self) -> fedimint_core::core::OperationId {
        fedimint_core::core::OperationId(self.0)
    }
}

impl Translate<fedimint_client_v1::sm::OperationId> for fedimint_core::core::OperationId {
    fn translate(self) -> fedimint_client_v1::sm::OperationId {
        fedimint_client_v1::sm::OperationId(self.0)
    }
}

impl Translate<fedimint_client::db::ChronologicalOperationLogKey>
    for fedimint_client_v1::db::ChronologicalOperationLogKey
{
    fn translate(self) -> fedimint_client::db::ChronologicalOperationLogKey {
        fedimint_client::db::ChronologicalOperationLogKey {
            creation_time: self.creation_time,
            operation_id: self.operation_id.translate(),
        }
    }
}

impl Translate<stability_pool_client::common::AccountInfo>
    for stability_pool_client_v1::common::AccountInfo
{
    fn translate(self) -> stability_pool_client::common::AccountInfo {
        stability_pool_client::common::AccountInfo {
            idle_balance: self.idle_balance.translate(),
            staged_seeks: self.staged_seeks.translate(),
            staged_provides: self.staged_provides.translate(),
            staged_cancellation: self.staged_cancellation.translate(),
            locked_seeks: self
                .locked_seeks
                .into_iter()
                .map(|l| l.lock)
                .collect::<Vec<_>>()
                .translate(),
            locked_provides: self.locked_provides.translate(),
            seeks_metadata: BTreeMap::new(),
        }
    }
}

impl Translate<stability_pool_client::common::Seek> for stability_pool_client_v1::common::Seek {
    fn translate(self) -> stability_pool_client::common::Seek {
        stability_pool_client::common::Seek(self.0.translate())
    }
}

impl Translate<stability_pool_client::common::StagedSeek>
    for stability_pool_client_v1::common::StagedSeek
{
    fn translate(self) -> stability_pool_client::common::StagedSeek {
        stability_pool_client::common::StagedSeek {
            txid: TransactionId::all_zeros(),
            sequence: self.sequence,
            seek: self.seek.translate(),
        }
    }
}

impl Translate<stability_pool_client::common::Provide>
    for stability_pool_client_v1::common::Provide
{
    fn translate(self) -> stability_pool_client::common::Provide {
        stability_pool_client::common::Provide {
            amount: self.amount.translate(),
            min_fee_rate: self.min_fee_rate,
        }
    }
}

impl Translate<stability_pool_client::common::StagedProvide>
    for stability_pool_client_v1::common::StagedProvide
{
    fn translate(self) -> stability_pool_client::common::StagedProvide {
        stability_pool_client::common::StagedProvide {
            sequence: self.sequence,
            provide: self.provide.translate(),
        }
    }
}

impl Translate<stability_pool_client::common::CancelRenewal>
    for stability_pool_client_v1::common::CancelRenewal
{
    fn translate(self) -> stability_pool_client::common::CancelRenewal {
        stability_pool_client::common::CancelRenewal { bps: self.bps }
    }
}

impl Translate<stability_pool_client::common::LockedSeek>
    for stability_pool_client_v1::common::LockedSeek
{
    fn translate(self) -> stability_pool_client::common::LockedSeek {
        stability_pool_client::common::LockedSeek {
            staged_txid: TransactionId::all_zeros(),
            staged_sequence: self.staged_sequence,
            amount: self.amount.translate(),
        }
    }
}

impl Translate<stability_pool_client::common::SeekMetadata>
    for stability_pool_client_v1::common::SeekMetadata
{
    fn translate(self) -> stability_pool_client::common::SeekMetadata {
        stability_pool_client::common::SeekMetadata {
            initial_amount: self.initial_amount.translate(),
            initial_amount_cents: self.initial_amount_cents,
            withdrawn_amount: self.withdrawn_amount.translate(),
            withdrawn_amount_cents: self.withdrawn_amount_cents,
            fees_paid_so_far: self.fees_paid_so_far.translate(),
            first_lock_start_time: self.first_lock_start_time,
            fully_withdrawn: false,
        }
    }
}

impl Translate<stability_pool_client::common::LockedProvide>
    for stability_pool_client_v1::common::LockedProvide
{
    fn translate(self) -> stability_pool_client::common::LockedProvide {
        stability_pool_client::common::LockedProvide {
            staged_sequence: self.staged_sequence,
            staged_min_fee_rate: self.staged_min_fee_rate,
            amount: self.amount.translate(),
        }
    }
}
