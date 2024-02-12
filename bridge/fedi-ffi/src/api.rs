use std::collections::BTreeMap;
use std::time::Duration;

use anyhow::bail;
use fedimint_core::core::ModuleKind;
use fedimint_core::task::{MaybeSend, MaybeSync};
use fedimint_core::{apply, async_trait_maybe_send};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::constants::FEDI_FEE_API_URL;
use crate::storage::{FediFeeSchedule, ModuleFediFeeSchedule};

/// Trait that represents the API for communicating with Fedi-hosted services.
#[apply(async_trait_maybe_send!)]
pub trait IFediApi: MaybeSend + MaybeSync + 'static {
    /// Fetches the fee schedule for transactions conducted within a federation
    /// through the Fedi app.
    // #[allow(async_fn_in_trait)]
    async fn fetch_fedi_fee_schedule(&self) -> anyhow::Result<FediFeeSchedule>;
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
    async fn fetch_fedi_fee_schedule(&self) -> anyhow::Result<FediFeeSchedule> {
        // The response is a list of fee schedules. We pick the first one we can
        // understand.
        let fee_schedule_list = fedimint_core::task::timeout(Duration::from_secs(15), async {
            self.client.get(FEDI_FEE_API_URL).send().await
        })
        .await??
        .json::<Vec<FediFeeScheduleItem>>()
        .await?;

        let Some(FediFeeScheduleItem::V0(fee_schedule)) = fee_schedule_list.first() else {
            bail!("No known fee schedules found");
        };

        Ok(FediFeeSchedule {
            remittance_threshold_msat: fee_schedule.remittance_threshold_msat,
            modules: fee_schedule
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
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum FediFeeScheduleItem {
    V0(FediFeeScheduleV0),
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
