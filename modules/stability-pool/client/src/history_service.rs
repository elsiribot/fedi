use std::ops::Range;
use std::sync::Arc;

use anyhow::bail;
use fedimint_api_client::api::{DynModuleApi, FederationApiExt as _};
use fedimint_core::db::{Database, DatabaseTransaction, IDatabaseTransactionOpsCoreTyped};
use fedimint_core::module::ApiRequestErased;
use fedimint_core::util::backoff_util::{self};
use fedimint_core::util::retry;
use fedimint_core::{Amount, TransactionId};
use futures::{Stream, StreamExt};
use itertools::Itertools;
use stability_pool_common::{
    AccountHistoryItem, AccountHistoryItemKind, AccountHistoryRequest, AccountId, FiatAmount,
    SyncResponse,
};
use tokio::sync::watch;
use tokio_stream::wrappers::WatchStream;

use crate::db::{
    AccountHistoryItemKey, AccountHistoryItemKeyPrefix, CachedSyncResponseKey,
    CachedSyncResponseValue,
};
use crate::StabilityPoolSyncService;

/// Service that syncs account history from server in the background
#[derive(Debug)]
pub struct StabilityPoolHistoryService {
    is_fetching: watch::Sender<bool>,
    module_api: DynModuleApi,
    db: Database,
    account_id: AccountId,
}

/// While each [`AccountHistoryItem`] represents a state transition for an
/// individual deposit, each [`UserOperationHistoryItem`] represents an action
/// initiated by the user. The list of [`UserOperationHistoryItem`] can be built
/// by taking the list of [`AccountHistoryItem`] and grouping by TX ID, and then
/// applying certain rules to each group based on the
/// [`AccountHistoryItemKind`]s noticed within the group. See
/// [`UserOperationHistoryItemKind`] for these rules.
pub struct UserOperationHistoryItem {
    /// ID of TX submitted by the user. This can be used as a unique key to
    /// reconcile with the operation log for example.
    pub txid: TransactionId,

    /// Index of the cycle in which the user operation was initiated.
    pub cycle_idx: u64,

    /// Amount of bitcoin involved in this transaction in msats
    pub amount: Amount,

    /// Amount of fiat involved in this transaction using the price of bitcoin
    /// from the start of the cycle in which the transaction took place.
    pub fiat_amount: FiatAmount,

    /// The kind of operation (deposit, withdrawal, or transfer)
    pub kind: UserOperationHistoryItemKind,
}

/// Once we group the [`AccountHistoryItem`]s by TX ID, we can derive the nature
/// of the user operation using the rules mentioned in each of the variants
/// below.
pub enum UserOperationHistoryItemKind {
    /// Group of [`AccountHistoryItem`]s contains only one item of kind
    /// DepositToStaged
    PendingDeposit,

    /// Group of [`AccountHistoryItem`]s contains > 1 item with the first being
    /// of kind DepositToStaged. For now, we do not consider any subsequent
    /// state transitions such as deposit getting kicked out due to lack of
    /// liquidity and then being relocked later if more liquidity is available.
    CompletedDeposit,

    /// To determine the status of a withdrawal we also need to know if there
    /// is an active unlock request. This information is found from the cached
    /// [`SyncResponse`]. If there is no active unlock request, we do not have a
    /// pending withdrawal. But if there is an active unlock request, then we do
    /// have a pending withdrawal.
    ///
    /// Now if we have a pending withdrawal, it is possible that the latest
    /// [`AccountHistoryItem`] might be of kind StagedToIdle with a
    /// TX ID matching the TX ID of the unlock request.
    PendingWithdrawal,

    /// Group of [`AccountHistoryItem`]s looks like one of the below:
    /// - [LockedToIdle]
    /// - [StagedToIdle, LockedToIdle]
    /// - [StagedToIdle] with NO active unlock request
    CompletedWithdrawal,

    /// Group of [`AccountHistoryItem`]s looks like one of the below:
    /// - [StagedTransferIn]
    /// - [StagedTransferIn, LockedTransferIn]
    /// - [LockedTransferIn]
    TransferIn { from: AccountId, meta: Vec<u8> },

    /// Group of [`AccountHistoryItem`]s looks like one of the below:
    /// - [(StagedTransferOut)+]
    /// - [(StagedTransferOut)+, (LockedTransferOut)+]
    /// - [(LockedTransferOut)+]
    ///
    /// (X)+ means 1 or more of X
    TransferOut { to: AccountId, meta: Vec<u8> },
}

impl StabilityPoolHistoryService {
    pub fn new(module_api: DynModuleApi, db: Database, account_id: AccountId) -> Arc<Self> {
        Arc::new(Self {
            is_fetching: watch::Sender::new(false),
            module_api,
            db,
            account_id,
        })
    }

    /// Update history data in background.
    ///
    /// Caller should run this method in a task.
    pub async fn update_continuously(&self, sync_service: &StabilityPoolSyncService) {
        let mut updates = sync_service.subscribe_to_updates();

        // Keep updating based on sync updates
        while let Some(Some(sync)) = updates.next().await {
            retry("history fetch", backoff_util::background_backoff(), || {
                self.update_once(&sync)
            })
            .await
            .expect("inifinite retry");
        }
    }

    async fn update_once(&self, sync_response: &SyncResponse) -> anyhow::Result<()> {
        let local_count = Self::get_account_history_count(
            &mut self.db.begin_transaction_nc().await,
            self.account_id,
        )
        .await;

        if sync_response.account_history_count == local_count {
            return Ok(());
        }

        if sync_response.account_history_count < local_count {
            bail!("server error: incorrect sync response");
        }

        let _ = self.is_fetching.send(true);
        let result = async {
            let new_history_items: Vec<AccountHistoryItem> = self
                .module_api
                .request_current_consensus(
                    "account_history".to_string(),
                    ApiRequestErased::new(AccountHistoryRequest {
                        account_id: self.account_id,
                        range: local_count..sync_response.account_history_count,
                    }),
                )
                .await?;

            let mut dbtx = self.db.begin_transaction().await;
            // Store each new item individually
            for (i, item) in new_history_items.into_iter().enumerate() {
                let key = AccountHistoryItemKey {
                    account_id: self.account_id,
                    index: local_count + i as u64,
                };
                dbtx.insert_entry(&key, &item).await;
            }

            dbtx.commit_tx().await;
            Ok(())
        }
        .await;
        let _ = self.is_fetching.send(false);
        result
    }

    pub async fn get_account_history_count(
        dbtx: &mut DatabaseTransaction<'_>,
        account_id: AccountId,
    ) -> u64 {
        dbtx.find_by_prefix_sorted_descending(&AccountHistoryItemKeyPrefix { account_id })
            .await
            .next()
            .await
            .map_or(0, |k| k.0.index)
    }

    /// Get all history items for the given account, ordered by index
    pub async fn get_account_history(
        &self,
        range: Range<u64>,
    ) -> anyhow::Result<Vec<AccountHistoryItem>> {
        let mut dbtx = self.db.begin_transaction().await;
        Ok(dbtx
            .find_by_range(
                AccountHistoryItemKey {
                    account_id: self.account_id,
                    index: range.start,
                }..AccountHistoryItemKey {
                    account_id: self.account_id,
                    index: range.end,
                },
            )
            .await
            .map(|(_key, value)| value)
            .collect()
            .await)
    }

    /// Subscribe to history fetch updates to show a loading.
    pub fn subscribe_to_fetches(&self) -> impl Stream<Item = bool> {
        WatchStream::new(self.is_fetching.subscribe())
    }

    /// Build a list of [`UserOperationHistoryItem`] by transforming the on-disk
    /// [`AccountHistoryItem`] list.
    // TODO shaurya: how to paginate?
    pub async fn list_user_operations(&self) -> anyhow::Result<Vec<UserOperationHistoryItem>> {
        let mut dbtx = self.db.begin_transaction_nc().await;
        let Some(CachedSyncResponseValue {
            value: sync_response,
            ..
        }) = dbtx
            .get_value(&CachedSyncResponseKey {
                account_id: self.account_id,
            })
            .await
        else {
            bail!("Need cached sync response to produce user operations list");
        };

        let local_count = Self::get_account_history_count(&mut dbtx, self.account_id).await;
        let acc_history_items = self.get_account_history(0..local_count).await?;
        let mut pending_withdrawal_found = false;
        let mut user_operations = vec![];

        // The chain below starts with the list of all account history items
        // 1. Group into map using TX ID whilst preserving index from original list
        // 2. Sort groups using lowest index, i.e., TX ID that produced earliest account
        //    history item goes first
        // 3. Transform sorted groups into iterator over tuple of (TXID,
        //    Vec<Acc_history_item>)
        for (txid, items) in acc_history_items
            .into_iter()
            .enumerate()
            .into_group_map_by(|(_, AccountHistoryItem { txid, .. })| *txid)
            .into_iter()
            .sorted_unstable_by_key(|(_, indexed_items)| {
                indexed_items.iter().map(|(idx, _)| *idx).min()
            })
            .map(|(txid, indexed_items)| {
                (
                    txid,
                    indexed_items
                        .into_iter()
                        .map(|(_, item)| item)
                        .collect_vec(),
                )
            })
        {
            match &items[..] {
                // Group of [`AccountHistoryItem`]s contains only one item of kind DepositToStaged
                [AccountHistoryItem {
                    cycle,
                    amount,
                    kind: AccountHistoryItemKind::DepositToStaged,
                    ..
                }] => {
                    user_operations.push(UserOperationHistoryItem {
                        txid,
                        cycle_idx: cycle.idx,
                        amount: *amount,
                        fiat_amount: FiatAmount::from_btc_amount(*amount, cycle.start_price)?,
                        kind: UserOperationHistoryItemKind::PendingDeposit,
                    });
                }
                // Group of [`AccountHistoryItem`]s contains > 1 item with the first being
                // of kind DepositToStaged. For now, we do not consider any subsequent
                // state transitions such as deposit getting kicked out due to lack of
                // liquidity and then being relocked later if more liquidity is available.
                [AccountHistoryItem {
                    cycle,
                    amount,
                    kind: AccountHistoryItemKind::DepositToStaged,
                    ..
                }, second, ..] => {
                    assert!(matches!(
                        second.kind,
                        AccountHistoryItemKind::StagedToLocked
                    ));
                    user_operations.push(UserOperationHistoryItem {
                        txid,
                        cycle_idx: cycle.idx,
                        amount: *amount,
                        fiat_amount: FiatAmount::from_btc_amount(*amount, cycle.start_price)?,
                        kind: UserOperationHistoryItemKind::CompletedDeposit,
                    });
                }
                // Group of [`AccountHistoryItem`]s contains only one element of type StagedToIdle
                [AccountHistoryItem {
                    cycle,
                    amount,
                    kind: AccountHistoryItemKind::StagedToIdle,
                    ..
                }] => {
                    // If we have an unlock request with matching TXID, it is a
                    // pending withdrawal. Otherwise it is a completed withdrawal with only staged
                    // funds that were moved.
                    if sync_response
                        .unlock_request
                        .as_ref()
                        .is_some_and(|request| request.txid == txid)
                    {
                        assert!(cycle.idx == sync_response.current_cycle.idx);
                        pending_withdrawal_found = true;
                        let (amount, fiat_amount) = sync_response
                            .amount_from_unlock_request()
                            .unwrap_or((Amount::ZERO, Default::default()));
                        user_operations.push(UserOperationHistoryItem {
                            txid,
                            cycle_idx: cycle.idx,
                            amount,
                            fiat_amount,
                            kind: UserOperationHistoryItemKind::PendingWithdrawal,
                        });
                    } else {
                        user_operations.push(UserOperationHistoryItem {
                            txid,
                            cycle_idx: cycle.idx,
                            amount: *amount,
                            fiat_amount: FiatAmount::from_btc_amount(*amount, cycle.start_price)?,
                            kind: UserOperationHistoryItemKind::CompletedWithdrawal,
                        });
                    }
                }
                // Group of [`AccountHistoryItem`]s looks like one of the below:
                // - [LockedToIdle]
                // - [StagedToIdle, LockedToIdle]
                [AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::LockedToIdle,
                    ..
                }]
                | [AccountHistoryItem {
                    kind: AccountHistoryItemKind::StagedToIdle,
                    ..
                }, AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::LockedToIdle,
                    ..
                }] => {
                    user_operations.push(UserOperationHistoryItem {
                        txid,
                        cycle_idx: cycle.idx,
                        amount: items.iter().map(|i| i.amount).sum(),
                        fiat_amount: FiatAmount(
                            items
                                .iter()
                                .map(|i| FiatAmount::from_btc_amount(i.amount, i.cycle.start_price))
                                .collect::<anyhow::Result<Vec<_>>>()?
                                .iter()
                                .map(|fa| fa.0)
                                .sum(),
                        ),
                        kind: UserOperationHistoryItemKind::CompletedWithdrawal,
                    });
                }
                // Group of [`AccountHistoryItem`]s looks like one of the below:
                // - [StagedTransferIn]
                // - [LockedTransferIn]
                // - [StagedTransferIn, LockedTransferIn]
                [AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::StagedTransferIn { from, meta },
                    ..
                }, ..]
                | [.., AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::LockedTransferIn { from, meta },
                    ..
                }] => {
                    user_operations.push(UserOperationHistoryItem {
                        txid,
                        cycle_idx: cycle.idx,
                        amount: items.iter().map(|i| i.amount).sum(),
                        fiat_amount: FiatAmount(
                            items
                                .iter()
                                .map(|i| FiatAmount::from_btc_amount(i.amount, i.cycle.start_price))
                                .collect::<anyhow::Result<Vec<_>>>()?
                                .iter()
                                .map(|fa| fa.0)
                                .sum(),
                        ),
                        kind: UserOperationHistoryItemKind::TransferIn {
                            from: *from,
                            meta: meta.to_vec(),
                        },
                    });
                }
                // Group of [`AccountHistoryItem`]s looks like one of the below:
                // - [+(StagedTransferOut)]
                // - [+(StagedTransferOut), +(LockedTransferOut)]
                // - [+(LockedTransferOut)]
                //
                // +(X) means 1 or more of X
                [AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::StagedTransferOut { to, meta },
                    ..
                }, ..]
                | [.., AccountHistoryItem {
                    cycle,
                    kind: AccountHistoryItemKind::LockedTransferOut { to, meta },
                    ..
                }] => {
                    user_operations.push(UserOperationHistoryItem {
                        txid,
                        cycle_idx: cycle.idx,
                        amount: items.iter().map(|i| i.amount).sum(),
                        fiat_amount: FiatAmount(
                            items
                                .iter()
                                .map(|i| FiatAmount::from_btc_amount(i.amount, i.cycle.start_price))
                                .collect::<anyhow::Result<Vec<_>>>()?
                                .iter()
                                .map(|fa| fa.0)
                                .sum(),
                        ),
                        kind: UserOperationHistoryItemKind::TransferOut {
                            to: *to,
                            meta: meta.to_vec(),
                        },
                    });
                }
                _ => (),
            }
        }

        // At the end, it is possible that a pending withdrawal exists but there was no
        // StagedToIdle transition logged. So we manually add a pending withdrawal as
        // the last operation.
        if !pending_withdrawal_found {
            if let Some(request) = sync_response.unlock_request.as_ref() {
                let (amount, fiat_amount) = sync_response
                    .amount_from_unlock_request()
                    .unwrap_or((Amount::ZERO, Default::default()));
                user_operations.push(UserOperationHistoryItem {
                    txid: request.txid,
                    cycle_idx: sync_response.current_cycle.idx,
                    amount,
                    fiat_amount,
                    kind: UserOperationHistoryItemKind::PendingWithdrawal,
                });
            }
        }

        Ok(user_operations)
    }
}
