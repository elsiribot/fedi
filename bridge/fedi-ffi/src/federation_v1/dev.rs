/// This file contains some utilities for overriding `127.0.0.1` making it possible to run devimint on host machine and connect to it from Android emulator
use std::str::FromStr;

use fedimint_core::{api::InviteCode, config::ClientConfig, db::DatabaseTransaction};
use fedimint_ln_client::{db::LightningGatewayKey, LightningGateway};
use tracing::info;
use url::Url;

fn override_localhost(url: &Url) -> Url {
    let fedi_localhost: Option<&'static str> = option_env!("FEDI_LOCALHOST");
    if let Some(fedi_localhost) = fedi_localhost {
        let url = Url::from_str(&url.to_string().replace("127.0.0.1", fedi_localhost)).unwrap();
        info!("Overriding 127.0.0.1->{:?}", url);
        url
    } else {
        url.clone()
    }
}

pub fn override_localhost_invite_code(invite_code: &mut InviteCode) {
    invite_code.url = override_localhost(&invite_code.url);
}

pub fn override_localhost_client_config(client_config: &mut ClientConfig) {
    let endpoints = client_config.api_endpoints.clone();
    client_config.api_endpoints = endpoints
        .into_iter()
        .map(|(peer_id, mut peer_url)| {
            peer_url.url = override_localhost(&peer_url.url);
            (peer_id, peer_url)
        })
        .collect();
}

pub async fn override_localhost_gateway(
    gateway: &mut LightningGateway,
    mut dbtx: DatabaseTransaction<'_>,
) {
    gateway.api = override_localhost(&gateway.api);
    dbtx.insert_entry(&LightningGatewayKey, &gateway).await;
    dbtx.commit_tx().await;
}
