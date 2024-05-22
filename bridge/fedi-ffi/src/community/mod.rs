use std::collections::BTreeMap;
use std::str::FromStr;
use std::time::Duration;

use anyhow::{bail, Context};
use bitcoin::bech32::{self, FromBase32};
use fedimint_core::util::FibonacciBackoff;
use serde::{Deserialize, Serialize};

use crate::constants::COMMUNITY_INVITE_CODE_HRP;
use crate::error::ErrorCode;

/// Community invite codes are bech32m encoded with the human-readable part
/// being "fedi:community". The decoded data is actually a json blob that
/// follows this schema.
#[derive(Debug, Deserialize)]
struct CommunityInvite {
    community_meta_url: String,
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
#[derive(Debug, Serialize, Deserialize)]
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
pub struct Community {}

impl Community {
    /// Decodes the invite code and fetches the community's JSON file.
    pub async fn preview(invite_code: &str) -> anyhow::Result<CommunityJson> {
        let community_invite = CommunityInvite::from_str(invite_code)?;

        // Retry the network request closure with backoff and an overall timeout of one
        // minute
        let client = reqwest::Client::new();
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
                        client.clone(),
                        community_invite.community_meta_url.clone(),
                    )
                },
            ),
        )
        .await?
    }
}

async fn fetch_community_meta_json(
    client: reqwest::Client,
    community_meta_url: String,
) -> anyhow::Result<CommunityJson> {
    Ok(fedimint_core::task::timeout(
        Duration::from_secs(5),
        client.get(community_meta_url).send(),
    )
    .await
    .context(ErrorCode::Timeout)??
    .json::<CommunityJson>()
    .await
    .map_err(|e| ErrorCode::InvalidJson(e.to_string()))?)
}
