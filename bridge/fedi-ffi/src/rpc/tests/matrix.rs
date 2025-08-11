use std::pin::pin;

use ::matrix::RpcTimelineItemContent;
use eyeball_im::VectorDiff;
use futures::future::try_join;
use futures::{Stream, StreamExt};
use imbl::Vector;
use matrix_sdk::timeout::timeout;

use super::*;

pub async fn test_matrix_login(_dev_fed: DevFed) -> anyhow::Result<()> {
    let td = TestDevice::new();
    let bridge = td.bridge_full().await?;

    // Wait for matrix to initialize
    let _matrix = bridge.matrix.wait().await;

    // If we get here, matrix login was successful
    Ok(())
}

fn apply_diffs<T: Clone>(v: &mut Vector<T>, diffs: Vec<VectorDiff<T>>) {
    for diff in diffs {
        diff.apply(v);
    }
}
async fn apply_diffs_continuously<T: Clone>(
    timeline: &mut Vector<T>,
    mut items: impl Stream<Item = Vec<VectorDiff<T>>> + Unpin,
) {
    while let Some(diffs) = items.next().await {
        apply_diffs(timeline, diffs);
    }
}

fn extract_text_from_item(item: &RpcTimelineItem) -> Option<String> {
    match item {
        RpcTimelineItem::Event(event) => match &event.content {
            RpcTimelineItemContent::Message(message_type) => Some(message_type.body().to_string()),
            RpcTimelineItemContent::Json(value) => {
                Some(value.get("content")?.get("body")?.as_str()?.to_owned())
            }
            RpcTimelineItemContent::RedactedMessage | RpcTimelineItemContent::Poll(..) => {
                unimplemented!()
            }
            RpcTimelineItemContent::Unknown => None,
        },
        _ => None,
    }
}

fn timeline_as_text(items: &Vector<RpcTimelineItem>) -> Vec<Option<String>> {
    items.iter().map(extract_text_from_item).collect()
}

pub async fn test_matrix_dms(_dev_fed: DevFed) -> anyhow::Result<()> {
    let td1 = TestDevice::new();
    let td2 = TestDevice::new();
    let m1 = td1.matrix().await?;
    let m2 = td2.matrix().await?;
    let user2 = m2.client.user_id().unwrap();
    let room_id = m1.create_or_get_dm(user2).await?;
    let num_messages = 50;

    m2.wait_for_room_id(&room_id).await?;
    m2.room_join(&room_id).await?;

    let (timeline1, timeline2) = try_join(
        // user 1
        async {
            let items1 = pin!(m1.room_timeline_items(&room_id).await?);
            for i in 0..num_messages {
                m1.send_message_text(&room_id, format!("#{i}")).await?;
            }

            let mut timeline1 = imbl::Vector::new();
            timeout(
                apply_diffs_continuously(&mut timeline1, items1),
                Duration::from_secs(10),
            )
            .await
            .ok();

            anyhow::Ok(timeline_as_text(&timeline1))
        },
        // user 2 is viewing the room
        async {
            sleep_in_test(
                "open the timeline after few message have been sent",
                Duration::from_secs(5),
            )
            .await;
            let mut items2 = pin!(m2.room_timeline_items(&room_id).await?);
            let mut timeline2 = imbl::Vector::new();
            timeout(
                try_join(
                    async {
                        apply_diffs_continuously(&mut timeline2, &mut items2).await;
                        anyhow::Ok(())
                    },
                    // keep scrolling to top
                    async {
                        let mut pagination_stream = pin!(
                            m2.subscribe_timeline_items_paginate_backwards_status(&room_id)
                                .await?
                        );
                        while let Some(value) = pagination_stream.next().await {
                            if let RpcBackPaginationStatus::Idle = value {
                                m2.room_timeline_items_paginate_backwards(&room_id, 100)
                                    .await?;
                            }
                        }

                        Ok(())
                    },
                ),
                Duration::from_secs(20),
            )
            .await
            .ok();

            anyhow::Ok(timeline_as_text(&timeline2))
        },
    )
    .await?;

    let timeline1_messages: Vec<String> = timeline1
        .into_iter()
        .flatten()
        .filter(|t| t.starts_with('#'))
        .collect();

    let timeline2_messages: Vec<String> = timeline2
        .into_iter()
        .flatten()
        .filter(|t| t.starts_with('#'))
        .collect();

    assert_eq!(timeline1_messages, timeline2_messages);
    assert_eq!(timeline1_messages.len(), num_messages);
    Ok(())
}
