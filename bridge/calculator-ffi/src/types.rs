use anyhow::anyhow;
use serde::Serialize;

pub fn hacky_millisat_to_sat(millisat: u64) -> u64 {
    (millisat as f64 / 1000 as f64).round() as u64
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FedimintFederation {
    pub name: String,
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
