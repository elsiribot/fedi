use std::collections::HashMap;
use std::sync::Arc;

use bitcoin::bech32::{self, FromBase32};
use bitcoin::secp256k1::Message;
use serde::Deserialize;
use url::Url;

use crate::bridge::Federation;

#[derive(Deserialize)]
struct KolliderResponse {
    lnurl_auth: String,
}

// TODO: don't unwrap
// TODO: don't assume we're talking to kollider
pub async fn lnurl_auth(url: String, federation: Arc<Federation>) -> anyhow::Result<String> {
    let response: KolliderResponse = reqwest::get(url).await?.json().await?;
    let decoded = bech32::decode(&response.lnurl_auth)?;
    let bytes = Vec::<u8>::from_base32(&decoded.1).unwrap();
    let url_string = String::from_utf8(bytes)?;
    let url = Url::parse(&url_string)?;
    let query: HashMap<_, _> = url.query_pairs().into_owned().collect();

    // there might be optional "action" here, too
    let k1 = query["k1"].clone();
    // let tag = query["tag"].clone();

    let k1_bytes = hex::decode(k1)?;
    let msg = Message::from_slice(&k1_bytes)?;
    let sig = federation.sign_with_node_privkey(&msg);
    let linking_key = federation.node_pubkey();

    let sig_string = hex::encode(sig.serialize_der());
    let linking_key_string = hex::encode(linking_key.serialize());
    let updated_url = format!(
        "{}&sig={}&key={}",
        url_string, sig_string, linking_key_string
    );

    let response2: serde_json::Value = reqwest::get(updated_url).await?.json().await?;
    let jwt = response2.get("token").unwrap().to_string();

    Ok(jwt)
}
