use std::collections::BTreeMap;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{bail, Context};
use bitcoin::bech32::{self, FromBase32};
use fedimint_core::task::TaskGroup;
use fedimint_core::util::FibonacciBackoff;
use serde::{Deserialize, Serialize};
use tokio::sync::{Mutex, RwLock};

use crate::constants::COMMUNITY_INVITE_CODE_HRP;
use crate::error::ErrorCode;
use crate::event::EventSink;
use crate::storage::{AppState, CommunityInfo};
use crate::types::RpcCommunity;

/// Communities is a coordinator-like struct that encapsulates all state and
/// logic related to the functionality of communities. The Bridge struct
/// contains a Communities struct and it delegates all communities-related calls
/// to its Communities struct.
#[derive(Clone)]
pub struct Communities {
    pub communities: Arc<Mutex<BTreeMap<String, Arc<Community>>>>,
    pub app_state: Arc<AppState>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
    http_client: reqwest::Client,
}

impl Communities {
    pub async fn init(
        app_state: Arc<AppState>,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Self {
        let joined_communities = app_state
            .with_read_lock(|state| state.joined_communities.clone())
            .await
            .into_iter()
            .map(|(id, info)| async {
                (
                    id,
                    Arc::new(Community::from_local_meta(
                        info.meta,
                        event_sink.clone(),
                        task_group.make_subgroup().await,
                    )),
                )
            });

        let communities = Arc::new(Mutex::new(
            futures::future::join_all(joined_communities)
                .await
                .into_iter()
                .collect::<BTreeMap<_, _>>(),
        ));

        Self {
            communities,
            app_state,
            event_sink,
            task_group,
            http_client: reqwest::Client::new(),
        }
    }

    pub async fn community_preview(&self, invite_code: &str) -> anyhow::Result<RpcCommunity> {
        Community::preview(invite_code, self.http_client.clone())
            .await
            .map(Into::into)
    }

    pub async fn join_community(&self, invite_code: &str) -> anyhow::Result<RpcCommunity> {
        let community = Community::join(
            invite_code,
            self.event_sink.clone(),
            self.task_group.make_subgroup().await,
            self.http_client.clone(),
        )
        .await?;
        let meta = community.meta.read().await.clone();
        let rpc_community = meta.clone().into();

        // Verify that community has not already been joined
        let mut communities = self.communities.lock().await;
        if communities.contains_key(&meta.community_id) {
            bail!("Community with ID {} already joined", meta.community_id);
        }

        // Write to AppState
        self.app_state
            .with_write_lock(|state| {
                state.joined_communities.insert(
                    meta.community_id.clone(),
                    CommunityInfo { meta: meta.clone() },
                );
            })
            .await?;

        // Write to memory
        communities.insert(meta.community_id, Arc::new(community));

        Ok(rpc_community)
    }
}

/// Community invite codes are bech32m encoded with the human-readable part
/// being "fedi:community". The decoded data is actually a json blob that
/// follows this schema.
#[derive(Debug, Serialize, Deserialize)]
pub struct CommunityInvite {
    pub community_meta_url: String,
}

impl FromStr for CommunityInvite {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let invite_code = s.to_lowercase();

        // TODO shaurya ok to ignore bech32 variant here?
        let (hrp, data, _) = bech32::decode(&invite_code)?;
        if hrp != COMMUNITY_INVITE_CODE_HRP {
            bail!("Unexpected hrp: {hrp}");
        }

        let decoded = Vec::from_base32(&data)?;
        let decoded_str = String::from_utf8(decoded)?;
        Ok(serde_json::from_str(&decoded_str)?)
    }
}

/// When fetching the Community's JSON file and deserializing it, we expect the
/// community ID, invite code, name, and version to always be there. All other
/// fields are encapsulated in the "meta" map and the front-end can decide how
/// best to utilize them.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CommunityJson {
    pub community_id: String,
    pub invite_code: String,
    pub community_name: String,
    pub version: u32,
    #[serde(flatten)]
    pub meta: BTreeMap<String, String>,
}

/// We think of a Community as a Federation without a wallet (fedimint-client).
/// So a Community affords all the functionality that comes from the root seed
/// such as chat, mods, npub-related features. And a community may also have its
/// own background tasks that it needs to run and its own events that it may
/// wish to pipe through.
#[derive(Clone)]
pub struct Community {
    /// Meta is an RwLock since most of the time we'll be reading it but
    /// occasionally we might update it if the remote data changes.
    pub meta: Arc<RwLock<CommunityJson>>,
    pub event_sink: EventSink,
    pub task_group: TaskGroup,
}

impl Community {
    /// Decodes the invite code and fetches the community's JSON file.
    pub async fn preview(
        invite_code: &str,
        http_client: reqwest::Client,
    ) -> anyhow::Result<CommunityJson> {
        let community_invite = CommunityInvite::from_str(invite_code)?;

        // Retry the network request closure with backoff and an overall timeout of one
        // minute
        fedimint_core::task::timeout(
            Duration::from_secs(60),
            fedimint_core::util::retry(
                "fetch community meta",
                FibonacciBackoff::default()
                    .with_min_delay(Duration::from_millis(100))
                    .with_max_delay(Duration::from_secs(3))
                    .with_max_times(usize::MAX)
                    .with_jitter(),
                || {
                    fetch_community_meta_json(
                        http_client.clone(),
                        community_invite.community_meta_url.clone(),
                    )
                },
            ),
        )
        .await?
    }

    /// Decodes the invite code and fetches the community's JSON file. Then
    /// constructs a Community object and returns it.
    pub async fn join(
        invite_code: &str,
        event_sink: EventSink,
        task_group: TaskGroup,
        http_client: reqwest::Client,
    ) -> anyhow::Result<Self> {
        Ok(Community {
            meta: RwLock::new(Self::preview(invite_code, http_client).await?).into(),
            event_sink,
            task_group,
        })
    }

    /// Uses the provided CommunityJson meta to construct a Community object and
    /// returns it.
    pub fn from_local_meta(
        meta: CommunityJson,
        event_sink: EventSink,
        task_group: TaskGroup,
    ) -> Self {
        Community {
            meta: RwLock::new(meta).into(),
            event_sink,
            task_group,
        }
    }
}

async fn fetch_community_meta_json(
    http_client: reqwest::Client,
    community_meta_url: String,
) -> anyhow::Result<CommunityJson> {
    Ok(fedimint_core::task::timeout(
        Duration::from_secs(5),
        http_client.get(community_meta_url).send(),
    )
    .await
    .context(ErrorCode::Timeout)??
    .json::<CommunityJson>()
    .await
    .map_err(|e| ErrorCode::InvalidJson(e.to_string()))?)
}
