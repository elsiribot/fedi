use std::collections::BTreeMap;
use std::sync::Arc;

use anyhow::anyhow;
use bitcoin::secp256k1::ecdsa::Signature;
use fedimint_client_fedi::UserClientConfig;
use fedimint_core::api::WsClientConnectInfo;
use fedimint_core::{
    config::ApiEndpoint,
    encoding::{Decodable, Encodable},
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::bridge::Federation;

/// FIXME: probably shouldn't return option
pub fn hacky_lightning_invoice_fee(
    invoice: &lightning_invoice::Invoice,
) -> anyhow::Result<fedimint_core::Amount> {
    invoice
        .amount_milli_satoshis()
        .map(|msat| {
            fedimint_core::Amount::from_msats(msat / 100) // FIXME: hard-coded 1% fee
        })
        .ok_or(anyhow!("Invoice missing amount"))
}

#[derive(Debug, Serialize, Deserialize, Encodable, Decodable, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct Amount(
    #[ts(type = "Opaque<number, 'fedimint_core::Amount'>")] pub fedimint_core::Amount,
);

#[derive(Debug, Serialize, Deserialize, Encodable, Decodable, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct PeerId(#[ts(type = "number")] pub fedimint_core::PeerId);

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RecoveryId(
    #[ts(type = "Opaque<string, 'RecoveryId'>")] pub fedi_social_client::common::RecoveryId,
);

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct FederationId(
    #[ts(type = "Opaque<string, 'FederationId'>")] pub fedimint_core::config::FederationId,
);

impl From<fedimint_core::config::FederationId> for FederationId {
    fn from(federation_id: fedimint_core::config::FederationId) -> Self {
        Self(federation_id)
    }
}

impl From<FederationId> for fedimint_core::config::FederationId {
    fn from(federation_id: FederationId) -> Self {
        federation_id.0
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct PublicKey(#[ts(type = "Opaque<string, 'PublicKey'>")] pub bitcoin::secp256k1::PublicKey);

#[derive(Debug, Serialize, Deserialize, TS)]
#[ts(export, export_to = "target/bindings/")]
pub struct FediConfig {
    #[ts(type = "any")]
    pub client_config: UserClientConfig,
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct FedimintFederation {
    pub id: FederationId,
    pub name: String,
    pub connect_info: String,
    #[ts(type = "Array<{url: string, name: string}>")]
    pub nodes: Vec<ApiEndpoint>,
    pub balance: Amount,
    pub social_recovery_active: bool,
    pub meta: BTreeMap<String, String>,
}

// FIXME: should probaby type these as bytes, but don't want to figure out serialization right now
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct XmppCredentials {
    pub password: String,
    pub keypair_seed: String,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct LnurlSignedMessage {
    #[ts(type = "string")]
    pub signature: Signature,
    pub pubkey: PublicKey,
}

// FIXME: this used to be a From implementation, but total_amount needed async
pub async fn federation_to_fedimint_federation(federation: &Arc<Federation>) -> FedimintFederation {
    let client_config = federation.client.config().0;
    let balance = federation.client.notes().await.total_amount();
    let social_recovery_active = federation.social_recovery_continue().await.is_ok();

    FedimintFederation {
        id: client_config.federation_id.into(),
        name: client_config
            .federation_name()
            .expect("federation name should exist")
            .clone(),
        connect_info: WsClientConnectInfo::from(&client_config).to_string(),
        nodes: client_config.api_endpoints.values().cloned().collect(),
        balance: Amount(balance),
        social_recovery_active,
        meta: client_config.meta,
    }
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct BridgeLightningGateway {
    #[ts(type = "Opaque<string, 'XOnlyPublicKey'>")]
    pub mint_pub_key: bitcoin::secp256k1::XOnlyPublicKey,
    #[ts(type = "Opaque<string, 'PublicKey'>")]
    pub node_pub_key: bitcoin::secp256k1::PublicKey,
    pub api: String, // TODO: url::Ur;
    pub active: bool,
}

#[derive(Clone, Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct Invoice {
    pub payment_hash: String,
    pub amount: Amount,
    pub fee: Amount,
    pub description: String,
    pub invoice: String,
}

impl TryFrom<&lightning_invoice::Invoice> for Invoice {
    type Error = anyhow::Error;

    fn try_from(invoice: &lightning_invoice::Invoice) -> anyhow::Result<Self> {
        let amount_msat = invoice
            .amount_milli_satoshis()
            .ok_or(anyhow!("Invoice missing amount"))?;
        let amount = fedimint_core::Amount::from_msats(amount_msat);

        // We might get no description
        let description = match invoice.description() {
            lightning_invoice::InvoiceDescription::Direct(desc) => desc.to_string(),
            lightning_invoice::InvoiceDescription::Hash(_) => "".to_string(),
        };

        let fee = hacky_lightning_invoice_fee(invoice)?;

        Ok(Invoice {
            amount: Amount(amount),
            fee: Amount(fee),
            description,
            invoice: invoice.to_string(),
            payment_hash: invoice.payment_hash().to_string(),
        })
    }
}
