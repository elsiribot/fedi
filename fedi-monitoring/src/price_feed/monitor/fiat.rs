use std::time::Duration;

use anyhow::Context;
use futures::future::join_all;
use tracing::warn;

use super::{try_add_price, try_retrieve_price, Price};
use crate::price_feed::{CurrencyPair, ExchangePriceMeasurement, ExchangePriceMeasurementResult};

pub(super) async fn measure_fiat_price(
    pair: &CurrencyPair,
    max_timeout: Duration,
) -> ExchangePriceMeasurementResult {
    let mut measurement = ExchangePriceMeasurement::default();
    let mut prices: Vec<Price> = vec![];
    // Free currency api
    let free_currency_api_request_retry = async {
        for _ in 0..10 {
            match free_currency_api_request(pair).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    warn!("Failed calling free_currency_api_request: {e:?}, will retry");
                    fedimint_core::task::sleep(Duration::from_secs(1)).await;
                }
            }
        }
        free_currency_api_request(pair).await
    };
    let free_currency_api_request_future = async {
        let result = free_currency_api_request_retry.await?;
        // TODO: perhaps check date?
        Ok(result.rate)
    };
    // TODO: add other sources
    let results = join_all(vec![try_retrieve_price(
        max_timeout,
        pair.clone(),
        free_currency_api_request_future,
    )])
    .await;
    for result in results {
        try_add_price(result, &mut prices, &mut measurement);
    }
    // TODO: perhaps require a minimum of price values or do some other sanity
    // checking?
    if prices.is_empty() {
        // no valid price found, return warnings as errors
        return Err(measurement.warnings);
    }
    prices.sort_by(|a, b| {
        a.0.partial_cmp(&b.0)
            .expect("floats to be normal because we checked somewhere else")
    });
    // Use median of the providers as the price
    measurement.chosen_rate = prices[prices.len() / 2];
    Ok(measurement)
}

#[derive(Debug)]
struct FreeCurrencyApiResult {
    _date: String,
    rate: f64,
}

// See https://github.com/fawazahmed0/currency-api
async fn free_currency_api_request(pair: &CurrencyPair) -> anyhow::Result<FreeCurrencyApiResult> {
    let base = pair.base.to_lowercase();
    let quote = pair.quote.to_lowercase();
    let url = format!("https://cdn.jsdelivr.net/gh/fawazahmed0/currency-api@1/latest/currencies/{base}/{quote}.json");
    let response: serde_json::Value = reqwest::get(url).await?.json().await?;
    Ok(FreeCurrencyApiResult {
        _date: response["date"]
            .as_str()
            .with_context(|| anyhow::anyhow!("missing date in response: {response:?}"))?
            .to_owned(),
        rate: response[quote.as_str()]
            .as_f64()
            .with_context(|| anyhow::anyhow!("missing {quote} in response: {response:?}"))?,
    })
}
