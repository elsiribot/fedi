use std::time::UNIX_EPOCH;

use fedimint_core::db::{DatabaseTransaction, IDatabaseTransactionOpsCoreTyped};
use fedimint_core::module::{api_endpoint, ApiEndpoint, ApiEndpointContext, ApiError};
use fedimint_core::Amount;
use secp256k1_zkp::PublicKey;
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
            async |_module: &StabilityPool, context, request: PublicKey| -> AccountInfo {
                Ok(account_info(&mut context.dbtx().into_nc(), request).await)
            }
        },
        api_endpoint! {
            "next_cycle_start_time",
            async |module: &StabilityPool, context, _request: ()| -> u64 {
                Ok(next_cycle_start_time(&mut context.dbtx().into_nc(), module).await?)
            }
        },
        api_endpoint! {
            "cycle_start_price",
            async |_module: &StabilityPool, context, _request: ()| -> u64 {
                Ok(cycle_start_price(&mut context.dbtx().into_nc()).await?)
            }
        },
        api_endpoint! {
            "wait_cancellation_processed",
            async |_module: &StabilityPool, context, request: PublicKey| -> Amount {
                Ok(wait_cancellation_processed(context, request).await?)
            }
        },
    ]
}

pub async fn account_info(dbtx: &mut DatabaseTransaction<'_>, account: PublicKey) -> AccountInfo {
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
    dbtx: &mut DatabaseTransaction<'_>,
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

pub async fn cycle_start_price(
    dbtx: &mut DatabaseTransaction<'_>,
) -> anyhow::Result<u64, ApiError> {
    let current_cycle_start_price = dbtx
        .get_value(&CurrentCycleKey)
        .await
        .ok_or(ApiError::server_error(
            "First cycle not yet started".to_owned(),
        ))?
        .start_price;

    Ok(current_cycle_start_price)
}

/// Wait until the given account's staged cancellation is processed
/// and return the amount of idle balance that can be withdrawn.
pub async fn wait_cancellation_processed(
    context: &mut ApiEndpointContext<'_>,
    account: PublicKey,
) -> anyhow::Result<Amount, ApiError> {
    let mut dbtx = context.dbtx().into_nc();
    let starting_idle_balance = match dbtx.get_value(&IdleBalanceKey(account)).await {
        Some(IdleBalance(amt)) => amt,
        None => Amount::ZERO,
    };

    let staged_cancellation = dbtx.get_value(&StagedCancellationKey(account)).await;
    drop(dbtx);

    match staged_cancellation {
        Some(_) => {
            // Cancellation is successfully processed when a higher idle balance exists than
            // the one we initially recorded.
            let future = context
                .wait_value_matches(IdleBalanceKey(account), |IdleBalance(new_idle_balance)| {
                    *new_idle_balance > starting_idle_balance
                });
            Ok(future.await.0)
        }
        None => {
            // If there's no staged cancellation but idle balance exists,
            // it's possible that the staged cancellation was already processed.
            // So we just return the amount of the idle balance.
            if starting_idle_balance != Amount::ZERO {
                Ok(starting_idle_balance)
            } else {
                Err(ApiError::bad_request(
                    "No staged cancellation or idle balance for account".to_owned(),
                ))
            }
        }
    }
}
