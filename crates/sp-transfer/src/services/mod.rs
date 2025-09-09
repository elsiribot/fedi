use std::sync::Arc;

use completion_notification_service::SptCompletionNotificationService;
use runtime::bridge_runtime::Runtime;

use self::account_id_responder::SptAccountIdResponder;
use self::transfer_completer::SptTransferCompleter;

pub mod account_id_responder;
pub mod completion_notification_service;
pub mod transfer_completer;

use fedimint_core::core::OperationId;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use rpc_types::SPv2TransferMetadata;
use stability_pool_client::common::{AccountId, FiatAmount, SignedTransferRequest};

#[apply(async_trait_maybe_send!)]
pub trait SptFederationProvider: MaybeSend + MaybeSync {
    async fn spv2_build_signed_transfer_request_with_nonce(
        &self,
        federation_id: &str,
        nonce: u64,
        to_account: AccountId,
        amount: FiatAmount,
    ) -> anyhow::Result<SignedTransferRequest>;

    async fn spv2_transfer(
        &self,
        federation_id: &str,
        signed_request: SignedTransferRequest,
        meta: SPv2TransferMetadata,
    ) -> anyhow::Result<OperationId>;

    async fn our_seeker_account_id(&self, federation_id: &str) -> Option<AccountId>;
}

pub struct SptServices {
    pub provider: Arc<dyn SptFederationProvider>,
    pub transfer_completer: SptTransferCompleter,
    pub account_id_responder: SptAccountIdResponder,
    pub completion_notification: Arc<SptCompletionNotificationService>,
}

impl SptServices {
    pub fn new(
        runtime: Arc<Runtime>,
        provider: Arc<dyn SptFederationProvider>,
        completion_notification: Arc<SptCompletionNotificationService>,
    ) -> Arc<Self> {
        Arc::new(Self {
            provider: provider.clone(),
            transfer_completer: SptTransferCompleter::new(runtime.clone(), provider.clone()),
            account_id_responder: SptAccountIdResponder::new(runtime.clone(), provider),
            completion_notification,
        })
    }
}
