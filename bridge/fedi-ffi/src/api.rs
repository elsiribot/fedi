use std::collections::BTreeMap;
use std::str::FromStr;
use std::time::Duration;

use anyhow::{bail, Context};
use bitcoin::Network;
use fedimint_core::core::ModuleKind;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send, Amount};
use lightning_invoice::Bolt11Invoice;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::constants::{
    FEDI_FEE_API_URL_MAINNET, FEDI_FEE_API_URL_MUTINYNET, FEDI_INVOICE_API_URL,
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
    async fn fetch_fedi_fee_invoice(&self, amount: Amount) -> anyhow::Result<Bolt11Invoice>;
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

        // The response is a list of fee schedules. We pick the first one we can
        // understand.
        let fee_schedule_list = fedimint_core::task::timeout(Duration::from_secs(15), async {
            self.client.get(api_url).send().await
        })
        .await
        .context("Request to fetch fee schedule took too long")?
        .context("Fetch fee schedule response error")?
        .json::<Vec<FediFeeScheduleItem>>()
        .await?;

        let Some(fee_schedule_v0) = fee_schedule_list.iter().find_map(|item| match item {
            FediFeeScheduleItem::V0(v0) => Some(v0),
            FediFeeScheduleItem::Unknown => None,
        }) else {
            bail!("No known fee schedules found");
        };

        Ok(FediFeeSchedule {
            remittance_threshold_msat: fee_schedule_v0.remittance_threshold_msat,
            modules: fee_schedule_v0
                .modules
                .iter()
                .map(|(k, v)| {
                    (
                        ModuleKind::clone_from_str(k),
                        ModuleFediFeeSchedule {
                            send_ppm: v.send_ppm,
                            receive_ppm: v.receive_ppm,
                        },
                    )
                })
                .collect(),
        })
    }

    async fn fetch_fedi_fee_invoice(&self, amount: Amount) -> anyhow::Result<Bolt11Invoice> {
        let fetch_invoice_response = fedimint_core::task::timeout(Duration::from_secs(15), async {
            self.client
                .post(FEDI_INVOICE_API_URL)
                .json(&FetchInvoiceRequest {
                    amount_msat: amount.msats,
                })
                .send()
                .await
        })
        .await
        .context("Request to fetch fee invoice took too long")?
        .context("Fetch fee invoice response error")?
        .json::<FetchInvoiceResponse>()
        .await?;

        Ok(Bolt11Invoice::from_str(&fetch_invoice_response.invoice)
            .context("Failed to parse fee invoice")?)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "version", rename_all = "lowercase")]
pub enum FediFeeScheduleItem {
    V0(FediFeeScheduleV0),
    #[serde(other)]
    Unknown,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FediFeeScheduleV0 {
    /// The minimum amount of fee in msat that must be accrued before an attempt
    /// is made to remit it to Fedi.
    pub remittance_threshold_msat: u64,

    /// Different types of transactions may have different fees. So each known
    /// module (identified by ModuleKind) has its own fee schedule for its
    /// transactions.
    pub modules: BTreeMap<String, ModuleFediFeeScheduleV0>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModuleFediFeeScheduleV0 {
    /// Represents the fee to charge on the amount in ppm whenever a module
    /// contributes an input to a transaction.
    pub send_ppm: u64,

    /// Represents the fee to charge on the amount in ppm whenever a module
    /// contributes an output to a transaction.
    pub receive_ppm: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FetchInvoiceRequest {
    pub amount_msat: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FetchInvoiceResponse {
    pub invoice: String,
}
