use std::sync::Arc;

use anyhow::anyhow;
use bitcoin::secp256k1::{ecdsa::Signature, PublicKey};
use fedimint_api::config::ApiEndpoint;
use mint_client::{api::WsFederationConnect, UserClientConfig};
use serde::{Deserialize, Serialize};

use crate::bridge::Federation;

/// FIXME: probably shouldn't return option
pub fn hacky_lightning_invoice_fee(
    invoice: &lightning_invoice::Invoice,
) -> anyhow::Result<fedimint_api::Amount> {
    invoice
        .amount_milli_satoshis()
        .map(|msat| {
            fedimint_api::Amount::from_msats(msat / 100) // FIXME: hard-coded 1% fee
        })
        .ok_or(anyhow!("Invoice missing amount"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FediConfig {
    pub client_config: UserClientConfig,
    pub username: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FedimintFederation {
    pub name: String,
    pub connect_info: WsFederationConnect,
    pub nodes: Vec<ApiEndpoint>,
    pub balance: fedimint_api::Amount,
    pub social_recovery_active: bool,
    // FIXME: maybe it's simpler to just not include this?
    pub username: Option<String>,
}

// FIXME: should probaby type these as bytes, but don't want to figure out serialization right now
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct XmppCredentials {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LnurlSignedMessage {
    pub signature: Signature,
    pub pubkey: PublicKey,
}

// FIXME: this used to be a From implementation, but total_amount needed async
pub async fn federation_to_fedimint_federation(federation: &Arc<Federation>) -> FedimintFederation {
    let client_config = federation.client.config().0;
    let balance = federation.client.coins().await.total_amount();
    let social_recovery_active = federation.social_recovery_continue().await.is_ok();
    let username = federation.username.lock().await.clone();

    FedimintFederation {
        name: client_config.federation_name.clone(),
        connect_info: WsFederationConnect::from(&client_config),
        nodes: client_config.nodes.clone(),
        balance,
        social_recovery_active,
        username,
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeLightningGateway {
    pub mint_pub_key: bitcoin::secp256k1::XOnlyPublicKey,
    pub node_pub_key: bitcoin::secp256k1::PublicKey,
    pub api: String, // TODO: url::Ur;
    pub active: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub payment_hash: String,
    pub amount: fedimint_api::Amount,
    pub fee: fedimint_api::Amount,
    pub description: String,
    pub invoice: String,
}

impl TryFrom<&lightning_invoice::Invoice> for Invoice {
    type Error = anyhow::Error;

    fn try_from(invoice: &lightning_invoice::Invoice) -> anyhow::Result<Self> {
        let amount_msat = invoice
            .amount_milli_satoshis()
            .ok_or(anyhow!("Invoice missing amount"))?;
        let amount = fedimint_api::Amount::from_msats(amount_msat);

        // We might get no description
        let description = match invoice.description() {
            lightning_invoice::InvoiceDescription::Direct(desc) => desc.to_string(),
            lightning_invoice::InvoiceDescription::Hash(_) => "".to_string(),
        };

        let fee = hacky_lightning_invoice_fee(invoice)?;

        Ok(Invoice {
            amount,
            fee,
            description,
            invoice: invoice.to_string(),
            payment_hash: invoice.payment_hash().to_string(),
        })
    }
}
