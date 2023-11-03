use std::time::UNIX_EPOCH;

use bitcoin::XOnlyPublicKey;
use fedimint_core_v2::core::ModuleInstanceId;
use fedimint_core_v2::db::ModuleDatabaseTransaction;
use fedimint_core_v2::module::{api_endpoint, ApiEndpoint, ApiError};
use fedimint_core_v2::Amount;
use stability_pool_common::{AccountInfo, LockedSeekWithMetadata};

use crate::db::{
    CurrentCycleKey, Cycle, IdleBalance, IdleBalanceKey, SeekMetadataKey, StagedCancellationKey,
    StagedProvidesKey, StagedSeeksKey,
};
use crate::StabilityPool;

pub fn endpoints() -> Vec<ApiEndpoint<StabilityPool>> {
    vec![
        api_endpoint! {
            "account_info",
            async |_module: &StabilityPool, context, request: XOnlyPublicKey| -> AccountInfo {
                Ok(account_info(&mut context.dbtx(), request).await)
            }
        },
        api_endpoint! {
            "next_cycle_start_time",
            async |module: &StabilityPool, context, _request: ()| -> u64 {
                Ok(next_cycle_start_time(&mut context.dbtx(), module).await?)
            }
        },
    ]
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

pub async fn next_cycle_start_time(
    dbtx: &mut ModuleDatabaseTransaction<'_, ModuleInstanceId>,
    stability_pool: &StabilityPool,
) -> anyhow::Result<u64, ApiError> {
    let current_cycle_start_time = dbtx
        .get_value(&CurrentCycleKey)
        .await
        .ok_or(ApiError::server_error(
            "First cycle not yet started".to_owned(),
        ))?
        .start_time;

    let cycle_duration = stability_pool.cfg.consensus.cycle_duration;
    let next_cycle_start_time = current_cycle_start_time + cycle_duration;
    Ok(next_cycle_start_time
        .duration_since(UNIX_EPOCH)
        .map_err(|_| ApiError::server_error("Server system clock error".to_owned()))?
        .as_secs())
}
