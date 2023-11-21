/// This file contains some utilities for overriding `127.0.0.1` making it
/// possible to run devimint on host machine and connect to it from Android
/// emulator
use std::str::FromStr;
use std::time::Duration;

use fedimint_core::api::InviteCode;
use fedimint_core::config::ClientConfig;
use fedimint_core::db::{Committable, DatabaseTransaction, IDatabaseTransactionOpsCoreTyped};
use fedimint_core::util::SafeUrl;
use fedimint_ln_common::db::LightningGatewayKey;
use fedimint_ln_common::{LightningGateway, LightningGatewayRegistration};
use tracing::info;

fn override_localhost(url: &SafeUrl) -> SafeUrl {
    let fedi_localhost: Option<&'static str> = option_env!("FEDI_LOCALHOST");
    if let Some(fedi_localhost) = fedi_localhost {
        let url = SafeUrl::from_str(&url.to_string().replace("127.0.0.1", fedi_localhost)).unwrap();
        info!("Overriding 127.0.0.1->{:?}", url);
        url
    } else {
        url.clone()
    }
}

pub fn override_localhost_invite_code(invite_code: &InviteCode) -> InviteCode {
    InviteCode::new(
        override_localhost(&invite_code.url()),
        invite_code.peer(),
        invite_code.federation_id(),
    )
}

pub fn override_localhost_client_config(client_config: &mut ClientConfig) {
    let endpoints = client_config.global.api_endpoints.clone();
    client_config.global.api_endpoints = endpoints
        .into_iter()
        .map(|(peer_id, mut peer_url)| {
            peer_url.url = override_localhost(&peer_url.url);
            (peer_id, peer_url)
        })
        .collect();
}

pub async fn override_localhost_gateway(
    gateway: &mut LightningGateway,
    mut dbtx: DatabaseTransaction<'_, Committable>,
) {
    gateway.api = override_localhost(&gateway.api);
    // uncomment this hack to trigger outgoing payments in refund case
    // gateway.api = Url::from_str(&gateway.api.to_string().replace("http",
    // "https")).unwrap();
    dbtx.insert_entry(
        &LightningGatewayKey(gateway.node_pub_key),
        &LightningGatewayRegistration {
            info: gateway.clone(),
            vetted: true,
            valid_until: fedimint_core::time::now()
                .checked_add(Duration::from_secs(86400))
                .expect("now + 1 day should add"),
        },
    )
    .await;
    dbtx.commit_tx().await;
}
