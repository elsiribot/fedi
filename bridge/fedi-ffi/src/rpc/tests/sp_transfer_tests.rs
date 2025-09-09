use std::pin::pin;

use fedimint_core::util::retry;
use fedimint_core::Amount;
use futures::StreamExt as _;
use rpc_types::matrix::RpcRoomId;
use rpc_types::sp_transfer::RpcSpTransferStatus;
use rpc_types::{FrontendMetadata, RpcAmount, RpcFiatAmount};
use sp_transfer::db::resolve_transfer_state;

use super::utils::test_backoff;
use super::*;

pub async fn test_end_to_end(_dev_fed: DevFed) -> anyhow::Result<()> {
    if should_skip_test_using_stock_fedimintd() {
        return Ok(());
    }

    // Two devices: sender and receiver
    let td_sender = TestDevice::new();
    let td_receiver = TestDevice::new();
    let bridge_sender = td_sender.bridge_full().await?;
    let bridge_receiver = td_receiver.bridge_full().await?;
    let matrix_sender = td_sender.matrix().await?;
    let matrix_receiver = td_receiver.matrix().await?;

    // Join default federation for both users
    let federation_sender = td_sender.join_default_fed().await?;
    let _federation_receiver = td_receiver.join_default_fed().await?;
    let federation_id = federation_sender.rpc_federation_id();

    // Create a DM room between sender and receiver
    let room_id = matrix_sender
        .create_or_get_dm(matrix_receiver.client.user_id().unwrap())
        .await?;
    matrix_receiver.wait_for_room_id(&room_id).await?;

    // Fund the sender: receive ecash and deposit to SPv2 seek account
    let initial_balance = Amount::from_sats(500_000);
    let ecash = cli_generate_ecash(initial_balance).await?;
    receiveEcash(
        federation_sender.clone(),
        ecash,
        FrontendMetadata::default(),
    )
    .await?;
    wait_for_ecash_reissue(federation_sender).await?;

    let deposit_amount = Amount::from_sats(400_000);
    spv2DepositToSeek(
        federation_sender.clone(),
        RpcAmount(deposit_amount),
        FrontendMetadata::default(),
    )
    .await?;
    // Wait for deposit to complete (3 events: Initiated -> TxAccepted -> Success)
    loop {
        if td_sender
            .event_sink()
            .num_events_of_type("spv2Deposit".into())
            == 3
        {
            break;
        }
        fedimint_core::task::sleep_in_test(
            "waiting spv2 deposit",
            std::time::Duration::from_millis(100),
        )
        .await;
    }

    // Send SP transfer from sender to receiver
    let fiat_amount = RpcFiatAmount(10_00);
    let pending_transfer_id = matrixSpTransferSend(
        bridge_sender,
        RpcRoomId(room_id.to_string()),
        fiat_amount,
        federation_id.clone(),
        None,
    )
    .await?;

    // receiver accepts the invitation and allows sending account id
    matrixRoomJoin(bridge_receiver, room_id.clone().into()).await?;

    // user 2 is viewing the room
    // in real app this is done by frontend - paginates all dms
    let matrix_receiver = td_receiver.matrix().await?.clone();

    let room_id_clone = room_id.clone();
    bridge_receiver
        .runtime
        .task_group
        .spawn_cancellable("receiver viewing room", async move {
            tracing::info!("receiver viewing room task started");
            let mut pagination_stream = pin!(matrix_receiver
                .subscribe_timeline_items_paginate_backwards_status(&room_id_clone)
                .await
                .unwrap());
            while let Some(value) = pagination_stream.next().await {
                if let RpcBackPaginationStatus::Idle = value {
                    matrix_receiver
                        .room_timeline_items_paginate_backwards(&room_id_clone, 100)
                        .await
                        .ok();
                }
            }
        });

    // Wait for SP Transfers completion using resolver on receiver side
    retry(
        "wait for SP transfer completion",
        test_backoff(100),
        || async {
            let state =
                resolve_transfer_state(bridge_receiver.runtime.clone(), &pending_transfer_id)
                    .await
                    .context("transfer state not yet available")?;
            // FIXME: get to complete status
            if state.status == RpcSpTransferStatus::SentHint {
                assert_eq!(state.amount, RpcFiatAmount(10_00));
                Ok(state)
            } else {
                anyhow::bail!("transfer not complete yet: {:?}", state.status)
            }
        },
    )
    .await?;

    Ok(())
}
