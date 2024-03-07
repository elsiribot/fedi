use std::collections::BTreeMap;
use std::str::FromStr;
use std::time::Duration;

use anyhow::Context;
use bitcoin::Network;
use fedi_api_types::fee_schedule::FeesV0;
use fedi_api_types::invoice_generator::{GenerateInvoiceRequestV0, GenerateInvoiceResponseV0};
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send, Amount};
use lightning_invoice::Bolt11Invoice;
use reqwest::Client;

use crate::constants::{
    FEDI_FEE_API_URL_MAINNET, FEDI_FEE_API_URL_MUTINYNET, FEDI_INVOICE_API_URL_MAINNET,
    FEDI_INVOICE_API_URL_MUTINYNET,
};
use crate::storage::{FediFeeSchedule, ModuleFediFeeSchedule};

/// Trait that represents the API for communicating with Fedi-hosted services.
#[apply(async_trait_maybe_send!)]
pub trait IFediApi: MaybeSend + MaybeSync + 'static {
    /// Fetches the fee schedule for transactions conducted within a federation
    /// through the Fedi app.
    async fn fetch_fedi_fee_schedule(&self, network: Network) -> anyhow::Result<FediFeeSchedule>;

    /// Fetches the lightning invoice for the given amount from Fedi's server to
    /// remit the oustanding fees accrued so far
    async fn fetch_fedi_fee_invoice(
        &self,
        amount: Amount,
        network: Network,
    ) -> anyhow::Result<Bolt11Invoice>;
}

/// Live code implementation of the IFediApi trait that uses a real
/// reqwest::Client to call out to Fedi's servers
pub struct LiveFediApi {
    client: Client,
}

impl LiveFediApi {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }
}

impl Default for LiveFediApi {
    fn default() -> Self {
        Self::new()
    }
}

#[apply(async_trait_maybe_send!)]
impl IFediApi for LiveFediApi {
    async fn fetch_fedi_fee_schedule(&self, network: Network) -> anyhow::Result<FediFeeSchedule> {
        let api_url = match network {
            Network::Bitcoin => FEDI_FEE_API_URL_MAINNET,
            _ => FEDI_FEE_API_URL_MUTINYNET,
        };

        let fee_schedule_v0 = fedimint_core::task::timeout(Duration::from_secs(15), async {
            self.client.get(api_url).send().await
        })
        .await
        .context("Request to fetch fee schedule took too long")?
        .context("Fetch fee schedule response error")?
        .json::<FeesV0>()
        .await?;

        let remittance_threshold_msat = fee_schedule_v0.remittance_threshold_msat;
        let mut modules = BTreeMap::new();
        modules.insert(
            fedimint_mint_client::KIND,
            ModuleFediFeeSchedule {
                send_ppm: fee_schedule_v0.modules.mint.send_ppm,
                receive_ppm: fee_schedule_v0.modules.mint.receive_ppm,
            },
        );
        modules.insert(
            fedimint_ln_common::KIND,
            ModuleFediFeeSchedule {
                send_ppm: fee_schedule_v0.modules.ln.send_ppm,
                receive_ppm: fee_schedule_v0.modules.ln.receive_ppm,
            },
        );
        modules.insert(
            fedimint_wallet_client::KIND,
            ModuleFediFeeSchedule {
                send_ppm: fee_schedule_v0.modules.wallet.send_ppm,
                receive_ppm: fee_schedule_v0.modules.wallet.receive_ppm,
            },
        );
        modules.insert(
            stability_pool_client::common::KIND,
            ModuleFediFeeSchedule {
                send_ppm: fee_schedule_v0.modules.stability_pool.send_ppm,
                receive_ppm: fee_schedule_v0.modules.stability_pool.receive_ppm,
            },
        );

        Ok(FediFeeSchedule {
            remittance_threshold_msat,
            modules,
        })
    }

    async fn fetch_fedi_fee_invoice(
        &self,
        amount: Amount,
        network: Network,
    ) -> anyhow::Result<Bolt11Invoice> {
        let api_url = match network {
            Network::Bitcoin => FEDI_INVOICE_API_URL_MAINNET,
            _ => FEDI_INVOICE_API_URL_MUTINYNET,
        };

        let invoice_v0 = fedimint_core::task::timeout(Duration::from_secs(15), async {
            self.client
                .post(api_url)
                .json(&GenerateInvoiceRequestV0 {
                    amount_msat: amount.msats,
                })
                .send()
                .await
        })
        .await
        .context("Request to fetch fee invoice took too long")?
        .context("Fetch fee invoice response error")?
        .json::<GenerateInvoiceResponseV0>()
        .await?;

        Ok(Bolt11Invoice::from_str(&invoice_v0.invoice).context("Failed to parse fee invoice")?)
    }
}
