use std::collections::{HashMap, VecDeque};
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::Serialize;

use self::monitor::Price;

pub mod alerts;
pub mod api;
pub mod monitor;

const FIAT_PAIRS_TO_RETRIEVE: [(&str, &str); 4] = [
    ("EUR", "USD"),
    ("CZK", "USD"),
    ("INR", "USD"),
    ("IDR", "USD"),
];

pub(super) const LATEST_CHECKS_COUNT: usize = 2;
/// Should be greater than `LATEST_CHECKS_COUNT`
pub(super) const MAX_CHECKS_TO_KEEP_ON_STATE: usize = 10;
pub(super) const CHECK_INTERVAL_TIME: Duration = Duration::from_secs(60 * 5);
/// How many check should fail before considering alerting it
pub(super) const LATEST_CHECKS_REQUIRED_FAILURE: usize = 3;

#[derive(Debug, Clone, Serialize)]
pub struct FullPriceFeedResponse {
    latest_prices: Vec<PriceFeedCheck>,
    alerts: Vec<String>,
    status: PriceFeedStatus,
}

#[derive(Debug, Clone, Serialize)]
pub struct LatestPricesResponse {
    prices: PricesMap,
}

#[derive(Debug, Clone, Default)]
pub struct PriceFeedState {
    checks: VecDeque<PriceFeedCheck>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PriceFeedCheck {
    result: PriceFeedCheckResult,
    alerts: Vec<String>,
    time: DateTime<Utc>,
}

// base/quote like BTC/USD or EUR/USD
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct CurrencyPair {
    base: String,
    quote: String,
}
impl CurrencyPair {
    fn new(base: &str, quote: &str) -> Self {
        Self {
            base: base.to_uppercase(),
            quote: quote.to_uppercase(),
        }
    }
}

impl std::fmt::Display for CurrencyPair {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}/{}", self.base, self.quote)
    }
}

// Examples:
// this is a BTC/USD:
//   ExchangeRate { rate: 28316.11, timestamp: "2023-10-17T02:26:00Z" }
// this is a EUR/USD:
//   ExchangeRate { rate: 1.05, timestamp: "2023-10-17T02:30:00Z" }
#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ExchangeRate {
    rate: Price,
    timestamp: DateTime<Utc>,
}

// Example: "BTC/USD"
type CurrencyPairString = String;

type PricesMap = HashMap<CurrencyPairString, ExchangeRate>;

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
pub struct SuccessPriceFeedCheckResult {
    exchange_rates: PricesMap,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
pub struct FailurePriceFeedCheckResult {
    failures: HashMap<CurrencyPairString, Vec<String>>,
}

#[derive(Debug, Clone, Default, Serialize, PartialEq)]
pub struct PartiallyFailedPriceFeedCheckResult {
    warnings: HashMap<CurrencyPairString, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct PriceFeedCheckResult {
    successes: SuccessPriceFeedCheckResult,
    failures: FailurePriceFeedCheckResult,
    partial_failures: PartiallyFailedPriceFeedCheckResult,
    elapsed_ms: u128,
}

#[derive(Debug, Clone, Serialize)]
enum PriceFeedStatus {
    Ok,
    Alert,
}

#[derive(Debug, Default)]
struct ExchangePriceMeasurement {
    chosen_rate: Price,
    warnings: Vec<String>,
}

type ExchangePriceMeasurementResult = Result<ExchangePriceMeasurement, Vec<String>>;
