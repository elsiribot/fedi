use std::fmt::Display;
use std::str::FromStr;

use anyhow::bail;
use bech32::Bech32m;
use nostr_sdk::PublicKey;
use runtime::constants::{COMMUNITY_INVITE_CODE_HRP, COMMUNITY_V2_INVITE_CODE_HRP};
use serde::{Deserialize, Serialize};

/// Community invite codes are bech32m encoded with the human-readable part
/// being "fedi:community". The decoded data is actually a JSON blob that
/// follows this schema.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommunityInvite {
    pub community_meta_url: String,
}

impl FromStr for CommunityInvite {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let invite_code = s.to_lowercase();

        // TODO shaurya ok to ignore bech32 variant here?
        let (hrp, data) = bech32::decode(&invite_code)?;
        if hrp != COMMUNITY_INVITE_CODE_HRP {
            bail!("Unexpected hrp: {hrp}");
        }

        let decoded_str = String::from_utf8(data)?;
        Ok(serde_json::from_str(&decoded_str)?)
    }
}

/// v2 invite codes are bech32m encoded with the human-readable part
/// being "fedi:community2". The decoded data is actually a JSON blob that
/// follows this schema.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommunityInviteV2 {
    pub author_pubkey: PublicKey,
    pub community_uuid_hex: String,
}

impl FromStr for CommunityInviteV2 {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let invite_code = s.to_lowercase();

        let (hrp, data) = bech32::decode(&invite_code)?;
        if hrp != COMMUNITY_V2_INVITE_CODE_HRP {
            bail!("Unexpected hrp: {hrp}");
        }

        let decoded_str = String::from_utf8(data)?;
        Ok(serde_json::from_str(&decoded_str)?)
    }
}

impl Display for CommunityInviteV2 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let invite_json_str = serde_json::to_string(self).map_err(|_| std::fmt::Error)?;
        let invite_bytes = invite_json_str.as_bytes();
        let invite_code = bech32::encode::<Bech32m>(COMMUNITY_V2_INVITE_CODE_HRP, invite_bytes)
            .map_err(|_| std::fmt::Error)?;
        write!(f, "{invite_code}")
    }
}
