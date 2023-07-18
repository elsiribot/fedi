// TODO: make a "shared utils" file
use bitcoin::Network;
use lightning_invoice::Currency;

pub fn display_currency(currency: Currency) -> String {
    match currency {
        Currency::Bitcoin => Network::Bitcoin.to_string(),
        Currency::Regtest => Network::Regtest.to_string(),
        Currency::BitcoinTestnet => Network::Testnet.to_string(),
        Currency::Signet => Network::Signet.to_string(),
        Currency::Simnet => "Simnet".to_string(),
    }
}

pub fn required_threashold_of(n: usize) -> usize {
    n - ((n - 1) / 3)
}
