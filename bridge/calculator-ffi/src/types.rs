use crate::payment::{Payment, PaymentDirection, PaymentStatus};
use anyhow::anyhow;

pub fn hacky_millisat_to_sat(millisat: u64) -> u64 {
    (millisat as f64 / 1000 as f64).round() as u64
}

#[derive(Clone, Debug)]
pub struct Invoice {
    pub payment_hash: String,
    pub amount: u64,
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

        Ok(Invoice {
            amount,
            description,
            invoice: invoice.to_string(),
            payment_hash: invoice.payment_hash().to_string(),
        })
    }
}

#[derive(Clone, Debug)]
pub struct BridgePayment {
    pub invoice: Invoice,
    pub status: PaymentStatus,
    pub created_at: u64,
    pub paid: bool,
    pub direction: PaymentDirection,
}

impl TryFrom<&Payment> for BridgePayment {
    type Error = anyhow::Error;

    fn try_from(payment: &Payment) -> anyhow::Result<Self> {
        Ok(Self {
            invoice: Invoice::try_from(&payment.invoice)?,
            status: payment.status,
            created_at: payment.created_at,
            paid: payment.paid(),
            direction: payment.direction,
        })
    }
}
