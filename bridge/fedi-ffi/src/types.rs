use std::{collections::BTreeMap, time::Duration};

use anyhow::anyhow;
use bitcoin::{secp256k1::ecdsa::Signature, Network};
use fedimint_core::config::PeerUrl;
use fedimint_ln_client::{
    pay::GatewayPayError, receive::LightningReceiveError, LnPayState, LnReceiveState,
};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::{
    bridge::MultiFederation, federation_v0::FederationV0, federation_v1::FederationV1,
    translate::Translate,
};

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcAmount(
    #[ts(type = "Opaque<number, 'fedimint_core::Amount'>")] pub fedimint_core::Amount,
);

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcFederation {
    // FIXME: this is a specific version
    pub balance: RpcAmount,
    pub id: RpcFederationId,
    #[ts(type = "string")]
    pub network: Network,
    pub name: String,
    pub invite_code: Option<String>,
    pub meta: BTreeMap<String, String>,
    pub social_recovery_active: bool,
    #[ts(type = "Array<{url: string, name: string}>")]
    pub nodes: BTreeMap<RpcPeerId, PeerUrl>,
}

#[derive(Debug, Eq, PartialEq, Hash, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcFederationId(
    #[ts(type = "Opaque<string, 'FederationId'>")] pub fedimint_core::config::FederationId,
);

pub async fn federation_v0_to_rpc_federation(federation: &FederationV0) -> RpcFederation {
    tracing::info!("federation_v0_to_rpc_federation");
    let balance = RpcAmount(federation.get_balance().await.translate());
    let id = RpcFederationId(federation.federation_id().translate());
    let name = federation.federation_name();
    let network = federation.get_network();
    let invite_code = federation.get_invite_code().await;
    let client_config = federation.client.get_config().await;
    let meta = client_config.meta.clone();
    let nodes = client_config
        .api_endpoints
        .clone()
        .iter()
        .map(|(peer_id, peer_url)| (RpcPeerId(peer_id.translate()), peer_url.clone().translate()))
        .collect();
    // Social recovery is disabled for v0 federations
    let social_recovery_active = false;
    RpcFederation {
        balance,
        id,
        network,
        name,
        invite_code,
        meta,
        nodes,
        social_recovery_active,
    }
}

pub async fn federation_v1_to_rpc_federation(federation: &FederationV1) -> RpcFederation {
    tracing::info!("federation_v1_to_rpc_federation");
    let balance = RpcAmount(federation.get_balance().await);
    let id = RpcFederationId(federation.federation_id());
    let name = federation.federation_name();
    let network = federation.get_network();
    let invite_code = federation.get_invite_code().await;
    let client_config = federation.client.get_config();
    let meta = federation.client.get_config().meta.clone();
    let nodes = client_config
        .api_endpoints
        .clone()
        .iter()
        .map(|(peer_id, peer_url)| (RpcPeerId(*peer_id), peer_url.clone()))
        .collect();
    let social_recovery_active = federation.social_recovery_continue().await.is_ok();
    RpcFederation {
        balance,
        id,
        network,
        name,
        invite_code,
        meta,
        nodes,
        social_recovery_active,
    }
}

pub async fn multi_federation_to_rpc_federation(multi: &MultiFederation) -> RpcFederation {
    match multi {
        MultiFederation::V0(federation) => federation_v0_to_rpc_federation(federation).await,
        MultiFederation::V1(federation) => federation_v1_to_rpc_federation(federation).await,
    }
}

#[derive(Clone, Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcInvoice {
    pub payment_hash: String,
    pub amount: RpcAmount,
    pub fee: RpcAmount,
    pub description: String,
    pub invoice: String,
}

/// FIXME: probably shouldn't return option
pub fn hacky_lightning_invoice_fee(
    invoice: &lightning_invoice::Invoice,
) -> anyhow::Result<fedimint_core::Amount> {
    invoice
        .amount_milli_satoshis()
        .map(|msat| {
            fedimint_core::Amount::from_msats(msat / 100) // FIXME: hard-coded 1% fee
        })
        .ok_or(anyhow!("Invoice missing amount"))
}

impl TryFrom<lightning_invoice::Invoice> for RpcInvoice {
    type Error = anyhow::Error;

    fn try_from(invoice: lightning_invoice::Invoice) -> anyhow::Result<Self> {
        let amount_msat = invoice
            .amount_milli_satoshis()
            .ok_or(anyhow!("Invoice missing amount"))?;
        let amount = fedimint_core::Amount::from_msats(amount_msat);

        // We might get no description
        let description = match invoice.description() {
            lightning_invoice::InvoiceDescription::Direct(desc) => desc.to_string(),
            lightning_invoice::InvoiceDescription::Hash(_) => "".to_string(),
        };

        let fee = hacky_lightning_invoice_fee(&invoice)?;

        Ok(RpcInvoice {
            amount: RpcAmount(amount),
            fee: RpcAmount(fee),
            description,
            invoice: invoice.to_string(),
            payment_hash: invoice.payment_hash().to_string(),
        })
    }
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcPayInvoiceResponse {
    pub preimage: String,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcLightningGatewayV1 {
    pub node_pub_key: RpcPublicKey,
    pub gateway_id: RpcPublicKey,
    pub api: String, // TODO: url::Ur;
    pub active: bool,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcLightningGatewayV0 {
    pub node_pub_key: RpcPublicKey,
    #[ts(type = "Opaque<string, 'XOnlyPublicKey'>")]
    pub mint_pub_key: bitcoin::secp256k1::XOnlyPublicKey,
    pub api: String, // TODO: url::Ur;
    pub active: bool,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)] // this just gives serialization of variant itself
#[ts(export, export_to = "target/bindings/")]
pub enum RpcLightningGateway {
    V0(RpcLightningGatewayV0),
    V1(RpcLightningGatewayV1),
}

#[derive(Serialize, Deserialize)]
pub struct FediBackupMetadata {
    // TODO: would be nice to rename this to xmpp_username but would need to basically migrate the backups
    pub username: Option<String>,
}

impl FediBackupMetadata {
    pub fn new(xmpp_username: Option<String>) -> Self {
        Self {
            username: xmpp_username,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcRecoveryId(
    #[ts(type = "Opaque<string, 'RecoveryId'>")] pub fedi_social_client::common::RecoveryId,
);

#[derive(Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SocialRecoveryQr {
    pub recovery_id: RpcRecoveryId,
}

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct SocialRecoveryApproval {
    // FIXME: perhaps this should be peer id and client can look up the name ???
    pub guardian_name: String,
    pub approved: bool,
}

#[derive(Debug, Eq, Ord, PartialOrd, PartialEq, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcPeerId(#[ts(type = "number")] pub fedimint_core::PeerId);

#[derive(Debug, Serialize, Deserialize, Clone, Copy, TS)]
#[serde(transparent)]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcPublicKey(
    #[ts(type = "Opaque<string, 'PublicKey'>")] pub bitcoin::secp256k1::PublicKey,
);

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcSignedLnurlMessage {
    #[ts(type = "string")]
    pub signature: Signature,
    pub pubkey: RpcPublicKey,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcTransaction {
    pub id: String,
    #[ts(type = "number")]
    pub created_at: u64,
    pub amount: RpcAmount,
    pub direction: String,
    pub notes: String,
    pub ln_state: Option<RpcLnState>,
    pub lightning: Option<RpcLightningDetails>,
    pub offline_transaction_details: Option<RpcOfflineTransactionDetails>,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
#[ts(export, export_to = "target/bindings/")]
pub enum RpcLnState {
    PayState(RpcLnPayState),
    RecvState(RpcLnReceiveState),
}

impl RpcLnState {
    pub fn from_ln_recv_state(opt: Option<LnReceiveState>) -> Option<RpcLnState> {
        match opt {
            Some(state) => Some(match state {
                LnReceiveState::Created => RpcLnState::RecvState(RpcLnReceiveState::Created),
                LnReceiveState::WaitingForPayment { invoice, timeout } => {
                    RpcLnState::RecvState(RpcLnReceiveState::WaitingForPayment { invoice, timeout })
                }
                LnReceiveState::Canceled { reason } => {
                    RpcLnState::RecvState(RpcLnReceiveState::Canceled { reason: reason })
                }
                LnReceiveState::Funded => RpcLnState::RecvState(RpcLnReceiveState::Funded),
                LnReceiveState::AwaitingFunds => {
                    RpcLnState::RecvState(RpcLnReceiveState::AwaitingFunds)
                }
                LnReceiveState::Claimed => RpcLnState::RecvState(RpcLnReceiveState::Claimed),
            }),
            None => None,
        }
    }
    pub fn from_ln_pay_state(opt: Option<LnPayState>) -> Option<RpcLnState> {
        match opt {
            Some(state) => Some(match state {
                LnPayState::Created => RpcLnState::PayState(RpcLnPayState::Created),
                LnPayState::Canceled => RpcLnState::PayState(RpcLnPayState::Canceled),
                LnPayState::Funded => RpcLnState::PayState(RpcLnPayState::Funded),
                LnPayState::WaitingForRefund {
                    block_height,
                    gateway_error,
                } => RpcLnState::PayState(RpcLnPayState::WaitingForRefund {
                    block_height,
                    gateway_error,
                }),
                LnPayState::AwaitingChange => RpcLnState::PayState(RpcLnPayState::AwaitingChange),
                LnPayState::Success { preimage } => {
                    RpcLnState::PayState(RpcLnPayState::Success { preimage })
                }
                LnPayState::Refunded { gateway_error } => {
                    RpcLnState::PayState(RpcLnPayState::Refunded { gateway_error })
                }
                LnPayState::UnexpectedError { .. } => RpcLnState::PayState(RpcLnPayState::Failed),
            }),
            None => None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export, export_to = "target/bindings/")]
pub enum RpcLnPayState {
    Created,
    Canceled,
    Funded,
    WaitingForRefund {
        block_height: u32,
        #[ts(type = "string")]
        gateway_error: GatewayPayError,
    },
    AwaitingChange,
    Success {
        preimage: String,
    },
    Refunded {
        #[ts(type = "string")]
        gateway_error: GatewayPayError,
    },
    Failed,
}

#[derive(Debug, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
#[ts(export, export_to = "target/bindings/")]
pub enum RpcLnReceiveState {
    Created,
    WaitingForPayment {
        invoice: String,
        #[ts(type = "string")]
        timeout: Duration,
    },
    Canceled {
        #[ts(type = "string")]
        reason: LightningReceiveError,
    },
    Funded,
    AwaitingFunds,
    Claimed,
}

#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcLightningDetails {
    pub invoice: String,
    pub fee: Option<RpcAmount>,
}

#[derive(Debug, Serialize, TS, Default)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcOfflineTransactionDetails {
    pub claimed: bool,
}

// FIXME: should probaby type these as bytes
#[derive(Debug, Serialize, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "target/bindings/")]
pub struct RpcXmppCredentials {
    pub password: String,
    pub keypair_seed: String,
    pub username: Option<String>,
}
