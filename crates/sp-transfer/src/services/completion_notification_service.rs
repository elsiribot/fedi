use std::sync::Arc;

use anyhow::Context as _;
use fedimint_core::db::{DatabaseTransaction, IDatabaseTransactionOpsCoreTyped as _};
use fedimint_core::util::backoff_util::background_backoff;
use fedimint_core::util::retry;
use futures::StreamExt as _;
use rpc_types::RpcEventId;
use rpc_types::matrix::RpcRoomId;
use rpc_types::sp_transfer::RpcSpTransferEvent;
use runtime::bridge_runtime::Runtime;
use tokio::sync::Notify;
use tracing::instrument;

use crate::db::{SptPendingCompletionNotification, SptPendingCompletionNotificationPrefix};
use crate::sp_transfers_matrix::SpTransfersMatrix;

pub struct SptCompletionNotificationService {
    notify: Notify,
    runtime: Arc<Runtime>,
}

impl SptCompletionNotificationService {
    pub fn new(runtime: Arc<Runtime>) -> Self {
        Self {
            notify: Notify::new(),
            runtime,
        }
    }

    fn trigger(&self) {
        self.notify.notify_one();
    }

    pub async fn add_completion_notification(
        &self,
        room_id: RpcRoomId,
        pending_transfer_id: RpcEventId,
        federation_id: String,
        fiat_amount_cents: u64,
        txid: fedimint_core::TransactionId,
    ) {
        let spt_db = self.runtime.sp_transfers_db();
        let mut dbtx = spt_db.begin_transaction().await;
        dbtx.insert_entry(
            &SptPendingCompletionNotification {
                room_id,
                pending_transfer_id,
                federation_id: rpc_types::RpcFederationId(federation_id),
                fiat_amount: rpc_types::RpcFiatAmount(fiat_amount_cents),
                txid: rpc_types::RpcTransactionId(txid),
            },
            &(),
        )
        .await;
        dbtx.commit_tx().await;
        self.trigger();
    }

    pub async fn run_continuously(&self, sp_transfers_matrix: &SpTransfersMatrix) {
        loop {
            retry(
                "send sp_transfers queued notifications",
                background_backoff(),
                || async { self.run_once(sp_transfers_matrix).await },
            )
            .await
            .expect("never fail");
            self.notify.notified().await;
        }
    }

    async fn run_once(&self, sp_transfers_matrix: &SpTransfersMatrix) -> anyhow::Result<()> {
        let spt_db = self.runtime.sp_transfers_db();
        let mut dbtx = spt_db.begin_transaction().await;
        let mut did_fail = false;
        let pending = dbtx
            .find_by_prefix(&SptPendingCompletionNotificationPrefix)
            .await
            .map(|(k, _)| k)
            .collect::<Vec<_>>()
            .await;
        for item in pending {
            if self
                .process_notification_item(&mut dbtx.to_ref_nc(), item, sp_transfers_matrix)
                .await
                .is_err()
            {
                did_fail = true;
            }
        }
        dbtx.commit_tx().await;
        if did_fail {
            // sometimes I love horrible error messages :)
            anyhow::bail!("something failed, retrying")
        }
        Ok(())
    }

    #[instrument(skip_all, fields(room = %item.room_id.0))]
    async fn process_notification_item(
        &self,
        dbtx: &mut DatabaseTransaction<'_>,
        item: SptPendingCompletionNotification,
        sp_transfers_matrix: &SpTransfersMatrix,
    ) -> anyhow::Result<()> {
        let room_id = item
            .room_id
            .into_typed()
            .context("invalid room id in sp_transfers database")?;
        sp_transfers_matrix
            .send_spt_event(
                &room_id,
                RpcSpTransferEvent::TransferSentHint {
                    pending_transfer_id: item.pending_transfer_id.clone(),
                    transaction_id: item.txid,
                },
            )
            .await
            .context("failed to send sp_transfers completion event")?;
        dbtx.remove_entry(&item).await;
        Ok(())
    }
}
