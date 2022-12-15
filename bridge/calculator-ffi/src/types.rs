use std::sync::Arc;

use anyhow::anyhow;
use fedimint_api::config::Node;
use mint_client::api::WsFederationConnect;
use serde::Serialize;

use crate::bridge::Federation;

pub fn hacky_millisat_to_sat(millisat: u64) -> u64 {
    (millisat as f64 / 1000 as f64).round() as u64
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FedimintFederation {
    pub name: String,
    pub connect_info: WsFederationConnect,
    pub nodes: Vec<Node>
}

impl From<&Arc<Federation>> for FedimintFederation {
    fn from(federation: &Arc<Federation>) -> Self {
        let client_config = federation.client.config().0;
        Self {
            name: client_config.federation_name.clone(),
            connect_info: WsFederationConnect::from(&client_config),
            nodes: client_config.nodes.clone(),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Invoice {
    pub payment_hash: String,
    pub amount: u64,
    pub fee: Option<u64>, // FIXME: probably shouldn't be option
    pub description: String,
    pub invoice: String,
}

impl TryFrom<&lightning_invoice::Invoice> for Invoice {
    type Error = anyhow::Error;

    fn try_from(invoice: &lightning_invoice::Invoice) -> anyhow::Result<Self> {
        let amount = invoice
            .amount_milli_satoshis()
            .map(|amount| hacky_millisat_to_sat(amount))
            .ok_or(anyhow!("Invoice missing amount"))?;

        // We might get no description
        let description = match invoice.description() {
            lightning_invoice::InvoiceDescription::Direct(desc) => desc.to_string(),
            lightning_invoice::InvoiceDescription::Hash(_) => "".to_string(),
        };

        let fee = invoice
            .amount_milli_satoshis()
            .map(|msat| {
                msat / 100 // FIXME: hard-coded 1% fee
            })
            .map(|msat| hacky_millisat_to_sat(msat));

        Ok(Invoice {
            amount,
            fee,
            description,
            invoice: invoice.to_string(),
            payment_hash: invoice.payment_hash().to_string(),
        })
    }
}
