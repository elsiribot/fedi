use bitcoin::{Address, Txid};

#[derive(Clone, Debug)]
pub struct BalanceEvent {
    pub federation_id: String,
    pub balance: u64,
}

#[derive(Clone, Debug)]
pub struct ReceivedLightningPaymentEvent {
    pub federation_id: String,
    pub payment_hash: String,
}

#[derive(Clone, Debug)]
pub struct ReceivedOnChainPaymentEvent {
    pub federation_id: String,
    pub txid: String,
    pub address: String,
}

#[derive(Clone, Debug)]
pub enum BridgeEvent {
    BalanceChanged(BalanceEvent),
    ReceivedLightningPayment(ReceivedLightningPaymentEvent),
    ReceivedOnChainPayment(ReceivedOnChainPaymentEvent),
}

impl BridgeEvent {
    pub fn balance_event(federation_id: String, balance: u64) -> Self {
        Self::BalanceChanged(BalanceEvent {
            federation_id,
            balance,
        })
    }
    pub fn received_lightning(federation_id: String, payment_hash: String) -> Self {
        Self::ReceivedLightningPayment(ReceivedLightningPaymentEvent {
            federation_id,
            payment_hash,
        })
    }
    pub fn received_on_chain(federation_id: String, txid: &Txid, address: &Address) -> Self {
        Self::ReceivedOnChainPayment(ReceivedOnChainPaymentEvent {
            federation_id,
            txid: txid.to_string(),
            address: address.to_string(),
        })
    }
}
