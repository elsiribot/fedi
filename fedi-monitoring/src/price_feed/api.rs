use std::sync::Arc;

use axum::http::StatusCode;
use axum::Json;
use tokio::sync::RwLock;

use super::alerts::generate_alerts_for_state;
use super::{
    FullPriceFeedResponse, LatestPricesResponse, PriceFeedState, PriceFeedStatus,
    LATEST_CHECKS_COUNT,
};

pub async fn get_full_state(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<PriceFeedState>>>,
) -> (StatusCode, Json<FullPriceFeedResponse>) {
    let state = state.read().await.clone();
    let alerts = generate_alerts_for_state(&state);
    let latest_prices = state
        .checks
        .into_iter()
        .take(LATEST_CHECKS_COUNT)
        .collect::<Vec<_>>();
    let status = if alerts.is_empty() {
        PriceFeedStatus::Ok
    } else {
        PriceFeedStatus::Alert
    };
    let response = FullPriceFeedResponse {
        latest_prices,
        alerts,
        status,
    };
    (StatusCode::OK, Json(response))
}

pub async fn get_latest_prices(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<PriceFeedState>>>,
) -> (StatusCode, Json<LatestPricesResponse>) {
    let latest = state.read().await.checks.front().cloned();
    let response = LatestPricesResponse {
        prices: latest
            .map(|p| p.result.successes.exchange_rates)
            .unwrap_or_default(),
    };
    (StatusCode::OK, Json(response))
}
