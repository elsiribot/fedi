use std::fmt::Debug;

use anyhow::{anyhow, bail};
use async_trait::async_trait;
use futures::future::join_all;
use reqwest::{Client, Url};
use tracing::warn;

#[async_trait]
pub trait Oracle: Sync + Send + Debug {
    // Returns current price in cents
    async fn get_price(&self) -> anyhow::Result<u64>;
}

#[derive(Debug)]
pub struct MockOracle {
    price_inner: Option<u64>,
}

#[async_trait]
impl Oracle for MockOracle {
    async fn get_price(&self) -> anyhow::Result<u64> {
        self.price_inner
            .ok_or(anyhow!("Price currently unavailable"))
    }
}

impl MockOracle {
    pub fn new() -> MockOracle {
        MockOracle {
            price_inner: Some(10_000 * 100), // 10k dollars in cents
        }
    }

    pub fn clear_price(&mut self) {
        self.price_inner = None;
    }

    /// Sets a new price that's returned from future
    /// calls to `get_price()`. Supplied price must be
    /// denominated in cents.
    pub fn set_new_price(&mut self, new_price: u64) {
        self.price_inner = Some(new_price)
    }
}

pub trait RemotePriceSource: Debug + Send + Sync {
    fn get_url(&self) -> Url;

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64>;
}

#[derive(Debug)]
struct BlockchainComAPI;

impl RemotePriceSource for BlockchainComAPI {
    fn get_url(&self) -> Url {
        "https://blockchain.info/ticker"
            .parse()
            .expect("blockchain.com API url must be valid")
    }

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64> {
        let float_price = json_value
            .as_object()
            .ok_or(anyhow!("Couldn't transform json value into object"))?
            .get("USD")
            .ok_or(anyhow!("Couldn't find key: USD at root level"))?
            .as_object()
            .ok_or(anyhow!("Couldn't transform USD key's value into object"))?
            .get("last")
            .ok_or(anyhow!("Couldn't find key: last inside USD object"))?
            .as_f64()
            .ok_or(anyhow!("Couldn't convert last USD value into float"))?;

        // Convert to whole number of cents
        Ok((float_price * 100.0) as u64)
    }
}

#[derive(Debug)]
struct CexIoAPI;

impl RemotePriceSource for CexIoAPI {
    fn get_url(&self) -> Url {
        "https://cex.io/api/ticker/BTC/USD"
            .parse()
            .expect("cex.io API url must be valid")
    }

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64> {
        let float_price = json_value
            .as_object()
            .ok_or(anyhow!("Couldn't transform json value into object"))?
            .get("last")
            .ok_or(anyhow!("Couldn't find key: last inside root object"))?
            .as_str()
            .ok_or(anyhow!("Couldn't read value for key: last as string"))?
            .parse::<f64>()?;

        // Convert to whole number of cents
        Ok((float_price * 100.0) as u64)
    }
}

#[derive(Debug)]
struct CoinGeckoComAPI;

impl RemotePriceSource for CoinGeckoComAPI {
    fn get_url(&self) -> Url {
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&precision=2"
            .parse()
            .expect("coingecko.com API url must be valid")
    }

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64> {
        let float_price = json_value
            .as_object()
            .ok_or(anyhow!("Couldn't transform json value into object"))?
            .get("bitcoin")
            .ok_or(anyhow!("Couldn't find key: bitcoin at root level"))?
            .as_object()
            .ok_or(anyhow!(
                "Couldn't transform value with key: bitcoin into object"
            ))?
            .get("usd")
            .ok_or(anyhow!("Couldn't find key: usd inside bitcoin object"))?
            .as_f64()
            .ok_or(anyhow!("Couldn't read key: usd as float"))?;

        // Convert to whole number of cents
        Ok((float_price * 100.0) as u64)
    }
}

#[derive(Debug)]
struct CoinbaseComAPI;

impl RemotePriceSource for CoinbaseComAPI {
    fn get_url(&self) -> Url {
        "https://api.coinbase.com/v2/prices/BTC-USD/spot"
            .parse()
            .expect("coinbase.com API url must be valid")
    }

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64> {
        let float_price = json_value
            .as_object()
            .ok_or(anyhow!("Couldn't transform json value into object"))?
            .get("data")
            .ok_or(anyhow!("Couldn't find key: data at root level"))?
            .as_object()
            .ok_or(anyhow!(
                "Couldn't transform value with key: data into object"
            ))?
            .get("amount")
            .ok_or(anyhow!("Couldn't find key: amount inside data object"))?
            .as_str()
            .ok_or(anyhow!("Couldn't read value for key: amount as string"))?
            .parse::<f64>()?;

        // Convert to whole number of cents
        Ok((float_price * 100.0) as u64)
    }
}

#[derive(Debug)]
struct BitstampNetAPI;

impl RemotePriceSource for BitstampNetAPI {
    fn get_url(&self) -> Url {
        "https://www.bitstamp.net/api/v2/ticker/btcusd"
            .parse()
            .expect("bitstamp.net API url must be valid")
    }

    fn extract_price_from_json_value(&self, json_value: serde_json::Value) -> anyhow::Result<u64> {
        let float_price = json_value
            .as_object()
            .ok_or(anyhow!("Couldn't transform json value into object"))?
            .get("last")
            .ok_or(anyhow!("Couldn't find key: last at root level"))?
            .as_str()
            .ok_or(anyhow!("Couldn't read value for key: last as string"))?
            .parse::<f64>()?;

        // Convert to whole number of cents
        Ok((float_price * 100.0) as u64)
    }
}

#[derive(Debug)]
pub struct AggregateOracle {
    client: Client,
    sources: Vec<Box<dyn RemotePriceSource>>,
}

impl AggregateOracle {
    pub fn new_with_default_sources() -> AggregateOracle {
        let sources: Vec<Box<dyn RemotePriceSource>> = vec![
            Box::new(BlockchainComAPI),
            Box::new(CexIoAPI),
            Box::new(CoinGeckoComAPI),
            Box::new(CoinbaseComAPI),
            Box::new(BitstampNetAPI),
        ];
        AggregateOracle {
            client: Client::new(),
            sources,
        }
    }
}

#[async_trait]
impl Oracle for AggregateOracle {
    async fn get_price(&self) -> anyhow::Result<u64> {
        let source_prices = join_all(self.sources.iter().map(|source| {
            let client = self.client.clone();
            let url = source.get_url();
            tokio::spawn(async move {
                Ok::<_, anyhow::Error>(
                    client
                        .get(url)
                        .send()
                        .await?
                        .json::<serde_json::Value>()
                        .await?,
                )
            })
        }))
        .await
        .into_iter()
        .enumerate()
        .filter_map(|(i, join_result)| match join_result {
            Ok(Ok(json_value)) => match self.sources[i].extract_price_from_json_value(json_value) {
                Ok(price) => Some(price),
                Err(e) => {
                    warn!("oracle source extract price from json value error: {e}");
                    None
                }
            },
            Ok(Err(e)) => {
                warn!("oracle source request error: {e}");
                None
            }
            Err(e) => {
                warn!("oracle source join error: {e}");
                None
            }
        })
        .collect::<Vec<_>>();

        // Succeed as long as at least one source worked
        if source_prices.is_empty() {
            bail!("None of the oracle sources worked");
        }

        Ok(source_prices[source_prices.len() / 2])
    }
}
