use devimint::external::{Bitcoind, Esplora, Lnd};
use devimint::federation::Federation;
use devimint::gatewayd::Gatewayd;
use devimint::recurringd::Recurringd;

use crate::devitrix::Synapse;

#[derive(Clone)]
pub struct DevFed {
    pub bitcoind: Bitcoind,
    pub lnd: Lnd,
    pub fed: Federation,
    pub gw_lnd: Gatewayd,
    pub gw_ldk: Gatewayd,
    pub gw_ldk_second: Gatewayd,
    pub esplora: Esplora,
    pub recurringd: Recurringd,
    pub synapse: Synapse,
}

impl DevFed {
    pub fn new(devimint: devimint::devfed::DevFed, synapse: Synapse) -> Self {
        Self {
            bitcoind: devimint.bitcoind,
            lnd: devimint.lnd,
            fed: devimint.fed,
            gw_lnd: devimint.gw_lnd,
            gw_ldk: devimint.gw_ldk,
            gw_ldk_second: devimint.gw_ldk_second,
            esplora: devimint.esplora,
            recurringd: devimint.recurringd,
            synapse,
        }
    }
}
