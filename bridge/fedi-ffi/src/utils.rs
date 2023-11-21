use std::time::{SystemTime, UNIX_EPOCH};

use bitcoin::Network;
use lightning_invoice::Currency;
use lightning_invoice_v1::Currency as CurrencyV1;

pub fn display_currency(currency: Currency) -> String {
    match currency {
        Currency::Bitcoin => Network::Bitcoin.to_string(),
        Currency::Regtest => Network::Regtest.to_string(),
        Currency::BitcoinTestnet => Network::Testnet.to_string(),
        Currency::Signet => Network::Signet.to_string(),
        Currency::Simnet => "Simnet".to_string(),
    }
}

pub fn display_currency_v1(currency: CurrencyV1) -> String {
    match currency {
        CurrencyV1::Bitcoin => Network::Bitcoin.to_string(),
        CurrencyV1::Regtest => Network::Regtest.to_string(),
        CurrencyV1::BitcoinTestnet => Network::Testnet.to_string(),
        CurrencyV1::Signet => Network::Signet.to_string(),
        CurrencyV1::Simnet => "Simnet".to_string(),
    }
}

pub fn required_threashold_of(n: usize) -> usize {
    n - ((n - 1) / 3)
}

pub fn unix_now() -> anyhow::Result<u64> {
    Ok(fedimint_core_v1::time::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())?)
}

pub fn to_unix_time(system_time: SystemTime) -> anyhow::Result<u64> {
    Ok(system_time
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())?)
}
