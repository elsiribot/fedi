use bitcoin::XOnlyPublicKey;
use fedimint_core::core::ModuleInstanceId;
use fedimint_core::db::ModuleDatabaseTransaction;
use fedimint_core::module::{api_endpoint, ApiEndpoint};
use fedimint_core::Amount;
use stability_pool_common::{AccountInfo, LockedSeekWithMetadata};

use crate::db::{
    CurrentCycleKey, Cycle, IdleBalance, IdleBalanceKey, SeekMetadataKey, StagedCancellationKey,
    StagedProvidesKey, StagedSeeksKey,
};
use crate::StabilityPool;

pub fn endpoints() -> Vec<ApiEndpoint<StabilityPool>> {
    vec![api_endpoint! {
        "account_info",
        async |_module: &StabilityPool, context, request: XOnlyPublicKey| -> AccountInfo {
            Ok(account_info(&mut context.dbtx(), request).await)
        }
    }]
}

pub async fn account_info(
    dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
    account: XOnlyPublicKey,
) -> AccountInfo {
    let (locked_seeks, locked_provides) = match dbtx.get_value(&CurrentCycleKey).await {
        Some(Cycle {
            locked_seeks: seeker_locks,
            locked_provides: provider_locks,
            ..
        }) => (
            seeker_locks
                .get(&account)
                .map(|v| v.to_vec())
                .unwrap_or_default(),
            provider_locks
                .get(&account)
                .map(|v| v.to_vec())
                .unwrap_or_default(),
        ),
        None => (vec![], vec![]),
    };

    let locked_seeks = {
        let mut locked_seeks_with_metadata = vec![];
        for lock in locked_seeks {
            let metadata = match dbtx.get_value(&SeekMetadataKey(lock.staged_sequence)).await {
                Some(metadata) => metadata,
                None => Default::default(),
            };
            locked_seeks_with_metadata.push(LockedSeekWithMetadata { lock, metadata });
        }
        locked_seeks_with_metadata
    };
    AccountInfo {
        idle_balance: dbtx
            .get_value(&IdleBalanceKey(account))
            .await
            .unwrap_or(IdleBalance(Amount::ZERO))
            .0,
        staged_seeks: dbtx
            .get_value(&StagedSeeksKey(account))
            .await
            .unwrap_or_default(),
        staged_provides: dbtx
            .get_value(&StagedProvidesKey(account))
            .await
            .unwrap_or_default(),
        staged_cancellation: dbtx.get_value(&StagedCancellationKey(account)).await,
        locked_seeks,
        locked_provides,
    }
}
