use std::collections::BTreeMap;

use runtime::storage::state::CommunityJson;

use super::*;

pub async fn test_nostr_community_workflow(_dev_fed: DevFed) -> anyhow::Result<()> {
    let td = TestDevice::new();
    let bridge = td.bridge_full().await?;

    let existing = nostrListOurCommunities(bridge).await?;
    assert!(
        existing.is_empty(),
        "expected no communities, found {}",
        existing.len()
    );

    let initial_name = "Nostr Test Community".to_string();
    let initial_description = "Initial description".to_string();

    let initial_meta = BTreeMap::from([("description".to_string(), initial_description.clone())]);

    let create_payload = CommunityJson {
        name: initial_name.clone(),
        version: 1,
        meta: initial_meta.clone(),
    };
    nostrCreateCommunity(bridge, serde_json::to_string(&create_payload)?).await?;

    let created = nostrListOurCommunities(bridge)
        .await?
        .into_iter()
        .find(|community| community.name == initial_name)
        .expect("expected created community to appear immediately");
    assert_eq!(
        initial_meta, created.meta,
        "created community meta mismatch"
    );

    Ok(())
}
