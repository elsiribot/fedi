use std::{collections::VecDeque, sync::Arc, time::Duration};

use anyhow::bail;
use axum::{http::StatusCode, Json};
use bitcoin::secp256k1;
use chrono::{DateTime, Utc};

use fedimint_core::{
    config::ClientConfig,
    task::{timeout, RwLock, TaskGroup},
    Amount,
};
use fedimint_ln_client::LightningClientExt;

use serde::Serialize;
use serde_with::{serde_as, DurationMilliSeconds};
use tracing::{debug, info, log::warn};

use crate::common::{
    build_client, gateway_pay_invoice, get_note_summary, reissue_notes, remint_denomination,
    try_cli_get_notes, try_mutinynet_faucet_create_invoice,
};

const AMOUNT_TO_REMINT: Amount = Amount::from_msats(1024);
const AMOUNT_TO_PAY: Amount = Amount::from_msats(1000);
/// How many results will be returned on response
const LATEST_CHECKS_COUNT: usize = 12;
/// How many results will be required to be successful for the status to be `Ok`
const LATEST_CHECKS_REQUIRED_SUCCESS: usize = 2;
/// Should be greater than `LATEST_CHECKS_COUNT`
const MAX_CHECKS_TO_KEEP_ON_STATE: usize = 120;

const CHECK_INTERVAL_TIME: Duration = Duration::from_secs(5 * 60);

const PAY_INVOICE_TIMEOUT: Duration = Duration::from_secs(4 * 60);
const GENERATE_INVOICE_TIMEOUT: Duration = Duration::from_secs(45);

/// How many times to retry operations like `get_notes` or `create_invoice` before considering it failed
const RETRIES_ON_OPERATIONS: usize = 10;

#[derive(Debug, Clone, Serialize)]
pub struct Check {
    result: CheckResult,
    time: DateTime<Utc>,
}

#[derive(Debug, Clone, Default)]
pub struct CheckState {
    checks: VecDeque<Check>,
}

#[derive(Debug, Clone, Serialize)]
pub enum Status {
    Ok,
    CheckError,
    StaleChecks,
    Empty,
}

#[derive(Debug, Clone, Serialize)]
pub struct CheckResponse {
    latest_checks: Vec<Check>,
    status: Status,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub enum CheckResult {
    Success {
        #[serde_as(as = "DurationMilliSeconds")]
        duration_ms: Duration,
    },
    Failure {
        error: String,
    },
}

pub async fn check_mutinynet(
    cfg: ClientConfig,
    gateway_public_key: Option<secp256k1::PublicKey>,
    state: Arc<RwLock<CheckState>>,
) -> anyhow::Result<()> {
    let interval_time = CHECK_INTERVAL_TIME;
    let mut tg = TaskGroup::new();
    let client = build_client(&cfg, &mut tg).await?;
    if let Some(gateway_public_key) = &gateway_public_key {
        client.set_active_gateway(gateway_public_key).await?;
    }

    loop {
        info!("Checking mutinynet...");
        let execution_result = async {
            let summary = get_note_summary(&client).await?;
            if summary.total_amount() <= AMOUNT_TO_REMINT {
                info!("Not enough funds, getting more");
                let notes = try_cli_get_notes(&AMOUNT_TO_REMINT, RETRIES_ON_OPERATIONS).await?;
                info!("Reissuing notes");
                reissue_notes(&client, notes).await?;
            }
            let notes_quantity = summary
                .iter()
                .find(|(amount, _quantity)| *amount == AMOUNT_TO_REMINT)
                .map(|(_amount, quantity)| quantity)
                .unwrap_or(0);
            if notes_quantity == 0 {
                info!("Reminting notes of denomination {AMOUNT_TO_REMINT}");
                remint_denomination(&client, AMOUNT_TO_REMINT, 1).await?;
            }
            info!("Creating invoice");
            let invoice = match timeout(
                GENERATE_INVOICE_TIMEOUT,
                try_mutinynet_faucet_create_invoice(&AMOUNT_TO_PAY, RETRIES_ON_OPERATIONS),
            )
            .await
            {
                Ok(Ok(invoice)) => invoice,
                Ok(Err(e)) => bail!("Failed to create invoice: {e:?}"),
                Err(_) => bail!("Timed out while creating invoice"),
            };
            debug!("Invoice: {:?}", invoice);
            info!("Paying invoice");
            let now = fedimint_core::time::now();
            match timeout(PAY_INVOICE_TIMEOUT, gateway_pay_invoice(&client, invoice)).await {
                Ok(Ok(())) => info!("Invoice paid"),
                Ok(Err(e)) => bail!("Failed to pay invoice: {e:?}"),
                Err(_) => bail!("Timed out while paying invoice"),
            };
            let elapsed = now.elapsed()?;
            Ok::<_, anyhow::Error>(elapsed)
        }
        .await;
        let result = match execution_result {
            Ok(elapsed) => CheckResult::Success {
                duration_ms: elapsed,
            },
            Err(e) => {
                warn!("Mutinynet check failed: {e:?}");
                CheckResult::Failure {
                    error: format!("{e:?}"), // uses the debug formatter to get the backtrace
                }
            }
        };
        {
            let mut state = state.write().await;
            state.checks.push_front(Check {
                result,
                time: fedimint_core::time::now().into(),
            });
            state.checks.truncate(MAX_CHECKS_TO_KEEP_ON_STATE);
        }
        info!("Sleeping for {interval_time:?}");
        tokio::time::sleep(interval_time).await;
    }
}

pub async fn get_status(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<CheckState>>>,
) -> (StatusCode, Json<CheckResponse>) {
    let check_state = state.read().await.clone();
    let latest_checks = check_state
        .checks
        .into_iter()
        .take(LATEST_CHECKS_COUNT)
        .collect::<Vec<_>>();

    let status = if latest_checks.is_empty() {
        Status::Empty
    } else {
        let has_required_successes = latest_checks
            .iter()
            .take(LATEST_CHECKS_REQUIRED_SUCCESS)
            .all(|check| matches!(check.result, CheckResult::Success { .. }));
        if has_required_successes {
            let has_recent_checks = latest_checks.iter().any(|check| {
                (Utc::now() - check.time).to_std().unwrap() <= CHECK_INTERVAL_TIME * 2
            });
            if has_recent_checks {
                Status::Ok
            } else {
                Status::StaleChecks
            }
        } else {
            Status::CheckError
        }
    };
    let check_response = CheckResponse {
        latest_checks,
        status,
    };

    (StatusCode::OK, Json(check_response))
}
