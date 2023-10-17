use chrono::Utc;

use super::{
    PriceFeedCheck, PriceFeedCheckResult, PriceFeedState, CHECK_INTERVAL_TIME,
    LATEST_CHECKS_REQUIRED_FAILURE,
};

pub(super) fn generate_alerts_for_result(check_result: &PriceFeedCheckResult) -> Vec<String> {
    let mut results = vec![];
    for (pair, warnings) in check_result.partial_failures.warnings.iter() {
        for warning in warnings {
            results.push(format!("Warning for {pair}: {warning}"))
        }
    }
    for (pair, failures) in check_result.failures.failures.iter() {
        for failure in failures {
            results.push(format!("Failure for {pair}: {failure}"))
        }
    }
    results
}

pub(super) fn generate_alerts_for_state(state: &PriceFeedState) -> Vec<String> {
    if state.checks.is_empty() {
        return vec!["No price yet".to_string()];
    }
    let latest: &PriceFeedCheck = state.checks.front().unwrap();
    let mut results = vec![];
    let last_check_interval = (Utc::now() - latest.time).to_std().unwrap();
    if last_check_interval > CHECK_INTERVAL_TIME * 2 {
        results.push(format!(
            "Last check is too late, it was {}s ago",
            last_check_interval.as_secs()
        ));
    }
    if state.checks.len() >= LATEST_CHECKS_REQUIRED_FAILURE
        && state
            .checks
            .iter()
            .take(LATEST_CHECKS_REQUIRED_FAILURE)
            .all(|check| !check.alerts.is_empty())
    {
        results.push(format!(
            "Last {LATEST_CHECKS_REQUIRED_FAILURE} checks failed"
        ));
        // Copy the alerts from the last check
        results.extend(latest.alerts.clone());
    }
    results
}
