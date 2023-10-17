use std::sync::Arc;
use std::time::Duration;

use fedimint_core::task::timeout;
use futures::future::join_all;
use futures::Future;
use serde::Serialize;
use tokio::join;
use tokio::sync::RwLock;
use tracing::{info, warn};

use super::{ExchangePriceMeasurement, PriceFeedState};
use crate::price_feed::alerts::generate_alerts_for_result;
use crate::price_feed::monitor::btc::measure_bitcoin_price;
use crate::price_feed::monitor::btc_price_oracle::AggregateOracle;
use crate::price_feed::monitor::fiat::measure_fiat_price;
use crate::price_feed::{
    CurrencyPair, ExchangeRate, FailurePriceFeedCheckResult, PartiallyFailedPriceFeedCheckResult,
    PriceFeedCheck, PriceFeedCheckResult, SuccessPriceFeedCheckResult, CHECK_INTERVAL_TIME,
    FIAT_PAIRS_TO_RETRIEVE, MAX_CHECKS_TO_KEEP_ON_STATE,
};

pub mod btc;
pub mod btc_price_oracle;
pub mod fiat;

pub async fn monitor_prices(state: Arc<RwLock<PriceFeedState>>) -> anyhow::Result<()> {
    let interval_time = CHECK_INTERVAL_TIME;
    let btc_oracle = AggregateOracle::new_with_default_sources();
    let fiat_pairs = FIAT_PAIRS_TO_RETRIEVE
        .into_iter()
        .map(|(base, quote)| CurrencyPair::new(base, quote))
        .collect::<Vec<_>>();
    let btc_usd = CurrencyPair::new("BTC", "USD");
    const GET_BTC_ORACLE_DATA_TIMEOUT: Duration = Duration::from_secs(120);
    const GET_FIAT_API_DATA_TIMEOUT: Duration = Duration::from_secs(60);

    loop {
        let mut successes = SuccessPriceFeedCheckResult::default();
        let mut failures = FailurePriceFeedCheckResult::default();
        let mut partial_failures = PartiallyFailedPriceFeedCheckResult::default();
        info!("Checking prices...");
        let now = fedimint_core::time::now();
        let result = async {
            let fiat_futures = fiat_pairs.iter().map(|pair| async {
                let result = measure_fiat_price(pair, GET_FIAT_API_DATA_TIMEOUT);
                (pair.clone(), result.await)
            });
            let btc_future = async {
                let result = measure_bitcoin_price(
                    btc_usd.clone(),
                    &btc_oracle,
                    GET_BTC_ORACLE_DATA_TIMEOUT,
                );
                (btc_usd.clone(), result.await)
            };

            let (btc_result, fiat_results) = join!(btc_future, join_all(fiat_futures));
            let mut all_results = fiat_results;
            all_results.push(btc_result);
            for (pair, result) in all_results {
                match result {
                    Ok(measurement) => {
                        if !measurement.warnings.is_empty() {
                            partial_failures
                                .warnings
                                .insert(pair.to_string(), measurement.warnings);
                        }
                        successes.exchange_rates.insert(
                            pair.to_string(),
                            ExchangeRate {
                                rate: measurement.chosen_rate,
                                timestamp: now.into(),
                            },
                        );
                    }
                    Err(messages) => {
                        assert!(!messages.is_empty());
                        failures.failures.insert(pair.to_string(), messages);
                    }
                }
            }
            PriceFeedCheckResult {
                successes,
                failures,
                partial_failures,
                elapsed_ms: now.elapsed().expect("time to work").as_millis(),
            }
        }
        .await;
        let alerts = generate_alerts_for_result(&result);
        if !alerts.is_empty() {
            warn!("Alerts:");
            for alert in &alerts {
                warn!("  {alert:?}");
            }
        }
        {
            let mut state = state.write().await;
            let check = PriceFeedCheck {
                result,
                alerts,
                time: fedimint_core::time::now().into(),
            };
            state.checks.push_front(check);
            state.checks.truncate(MAX_CHECKS_TO_KEEP_ON_STATE);
        }
        info!("Sleeping for {interval_time:?}");
        fedimint_core::task::sleep(interval_time).await;
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Serialize)]
#[repr(transparent)]
pub struct Price(f64);

impl Price {
    pub fn new(price: f64) -> Self {
        assert!(is_valid_price(price));
        Self(price)
    }
}

fn is_valid_price(price: f64) -> bool {
    // not NaN, infinite, zero etc
    price.is_normal() && price.is_sign_positive()
}

fn try_add_price(
    result: Result<Price, String>,
    prices: &mut Vec<Price>,
    measurement: &mut ExchangePriceMeasurement,
) {
    match result {
        Ok(price) => prices.push(price),
        Err(e) => measurement.warnings.push(e),
    };
}

async fn try_retrieve_price(
    max_timeout: Duration,
    pair: CurrencyPair,
    future: impl Future<Output = anyhow::Result<f64>>,
) -> Result<Price, String> {
    match timeout(max_timeout, future).await {
        Ok(Ok(price)) if is_valid_price(price) => Ok(Price(price)),
        Ok(Ok(result)) => Err(format!(
            "ignoring result {result:?} because it's not a valid price"
        )),
        Ok(Err(e)) => Err(format!("{e:?}")),
        Err(_elapsed) => Err(format!(
            "Reached timeout of {max_timeout:?} while getting price of {pair}"
        )),
    }
}
