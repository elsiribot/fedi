use std::time::Duration;

use anyhow::bail;
use fedimint_core::task::timeout;
use futures::future::join_all;
use tracing::warn;

use super::btc_price_oracle::Oracle;
use super::{try_add_price, try_retrieve_price, Price};
use crate::price_feed::{CurrencyPair, ExchangePriceMeasurement, ExchangePriceMeasurementResult};

pub(super) async fn measure_bitcoin_price(
    pair: CurrencyPair,
    btc_oracle: &impl Oracle,
    max_timeout: Duration,
) -> ExchangePriceMeasurementResult {
    // TODO: remove this blackbox oracle and let it expose all the individual prices
    // and errors that happen so we can return some of them as warnings
    let mut measurement = ExchangePriceMeasurement::default();
    let mut prices: Vec<Price> = vec![];
    let future_retry = async {
        for _ in 0..10 {
            match use_bitcoin_oracle(btc_oracle, max_timeout).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    warn!("Failed calling btc oracle: {e:?}, will retry");
                    fedimint_core::task::sleep(Duration::from_secs(1)).await;
                }
            }
        }
        use_bitcoin_oracle(btc_oracle, max_timeout).await
    };
    let results = join_all(vec![try_retrieve_price(
        max_timeout,
        pair.clone(),
        future_retry,
    )])
    .await;
    for result in results {
        try_add_price(result, &mut prices, &mut measurement);
    }
    if prices.is_empty() {
        return Err(measurement.warnings);
    }
    prices.sort_by(|a, b| {
        a.0.partial_cmp(&b.0)
            .expect("floats to be normal because we checked somewhere else")
    });
    measurement.chosen_rate = prices[prices.len() / 2];
    Ok(measurement)
}

async fn use_bitcoin_oracle(
    btc_oracle: &impl Oracle,
    max_timeout: Duration,
) -> anyhow::Result<f64> {
    match timeout(max_timeout, btc_oracle.get_price()).await {
        Ok(Ok(price)) => {
            // Note: oracle will return price in cents
            let converted = f64::try_from(u32::try_from(price)?)? / 100.0;
            Ok(converted)
        }
        Ok(Err(e)) => bail!("{e:?}"),
        Err(_elapsed) => {
            bail!("Reached timeout of {max_timeout:?} while getting BTC price")
        }
    }
}
