use std::{
    collections::{HashMap, HashSet, VecDeque},
    io::Write,
    sync::Arc,
    time::Duration,
};

use anyhow::Result;
use axum::{http::StatusCode, Json};
use chrono::{DateTime, Utc};

use fedimint_core::{
    config::FederationId,
    task::{timeout, RwLock},
    Amount,
};

use futures::TryFutureExt;
use ln_gateway::rpc::rpc_client::GatewayRpcClient;
use reqwest::Url;
use serde::Serialize;
use serde_with::{serde_as, DurationMilliSeconds};
use tonic_lnd::lnrpc::GetInfoRequest;
use tonic_lnd::lnrpc::WalletBalanceRequest;
use tonic_lnd::{
    lnrpc::{ListChannelsRequest, NodeInfoRequest},
    LndClient,
};

use tonic_lnd::lnrpc::ListPeersRequest;

use tracing::{info, log::warn};

use crate::MonitorLndGatewaysLimitsArgs;

/// How many results will be returned on response
const LATEST_CHECKS_COUNT: usize = 6;
/// Should be greater than `LATEST_CHECKS_COUNT`
const MAX_CHECKS_TO_KEEP_ON_STATE: usize = 60;

const CHECK_INTERVAL_TIME: Duration = Duration::from_secs(15);
/// How many check should fail before considering alerting it
const LATEST_CHECKS_REQUIRED_FAILURE: usize = 3;

#[derive(Debug, Clone, Serialize)]
pub struct LndGatewaysCheckResponse {
    latest_checks: Vec<LndGatewaysCheck>,
    alerts: Vec<String>,
    status: LndGatewaysStatus,
}

#[derive(Debug, Clone, Default)]
pub struct LndGatewaysState {
    checks: VecDeque<LndGatewaysCheck>,
}

#[derive(Debug, Clone, Serialize)]
pub struct LndGatewaysCheck {
    result: LndGatewaysCheckResult,
    alerts: Vec<String>,
    time: DateTime<Utc>,
}

#[serde_as]
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub enum LndGatewaysCheckResult {
    Success {
        #[serde_as(as = "DurationMilliSeconds")]
        duration_ms: Duration,
        gateway_data_results: Vec<Result<GatewayData, String>>,
        lnd_data_results: Vec<Result<LndData, String>>,
    },
    Failure {
        error: String,
    },
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct GatewayData {
    pub balance: Amount,
    pub info: GatewayInfoSummary,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct GatewayInfoSummary {
    pub lightning_pub_key: String,
    pub lightning_alias: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct ChannelInfo {
    pub active: bool,
    pub alias: String,
    ///The unique channel ID for the channel. The first 3 bytes are the block
    ///height, the next 3 the index within the block, and the last 2 bytes are the
    ///output index for the channel.
    pub chan_id: u64,
    /// The total amount of funds held in this channel
    pub capacity: Amount,
    /// This node's current balance in this channel
    pub local_balance: Amount,
    /// The counterparty's current balance in this channel
    pub remote_balance: Amount,
    ///The quantity of active, uncleared HTLCs currently pending within the channel.
    pub pending_htlcs_count: usize,

    pub local_chan_reserve: Amount,
    pub remote_chan_reserve: Amount,
}

impl ChannelInfo {
    fn available_local_balance(&self) -> Amount {
        self.local_balance.saturating_sub(self.local_chan_reserve)
    }
    fn available_remote_balance(&self) -> Amount {
        self.remote_balance.saturating_sub(self.remote_chan_reserve)
    }
}

impl ChannelInfo {
    fn from(
        channel: tonic_lnd::lnrpc::Channel,
        node_info: Option<Result<NodeInfo, String>>,
    ) -> Self {
        Self {
            active: channel.active,
            alias: match node_info {
                Some(Ok(node_info)) => node_info.node_alias,
                Some(Err(e)) => format!("error getting node info: {e}"),
                None => "unknown missing error".into(),
            },
            chan_id: channel.chan_id,
            capacity: Amount::from_sats(channel.capacity as u64),
            local_balance: Amount::from_sats(channel.local_balance as u64),
            remote_balance: Amount::from_sats(channel.remote_balance as u64),
            pending_htlcs_count: channel.pending_htlcs.len(),
            local_chan_reserve: Amount::from_sats(
                channel
                    .local_constraints
                    .map(|c| c.chan_reserve_sat)
                    .unwrap_or_default() as u64,
            ),
            remote_chan_reserve: Amount::from_sats(
                channel
                    .remote_constraints
                    .map(|c| c.chan_reserve_sat)
                    .unwrap_or_default() as u64,
            ),
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct NodeInfo {
    pub node_alias: String,
    pub latency_ms: Option<u64>,
}

impl NodeInfo {
    fn from(
        node_info: tonic_lnd::lnrpc::NodeInfo,
        connected_peer: Option<tonic_lnd::lnrpc::Peer>,
    ) -> Self {
        Self {
            node_alias: node_info
                .node
                .map(|n| {
                    let alias = n.alias.trim();
                    if alias.is_empty() {
                        n.pub_key
                    } else {
                        alias.to_owned()
                    }
                })
                .unwrap_or("unknown".into()),
            latency_ms: connected_peer.map(|p| p.ping_time as u64),
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct LndData {
    wallet_total_balance: Amount,
    wallet_locked_balance: Amount,
    wallet_reserved_balance: Amount,
    synchronized_to_graph: bool,
    synchronized_to_chain: bool,
    peers_with_channels_info: HashMap<String, Result<NodeInfo, String>>,
    channels: Vec<ChannelInfo>,
}

impl LndData {
    fn available_balance(&self) -> Amount {
        self.wallet_total_balance
            .saturating_sub(self.wallet_locked_balance)
            .saturating_sub(self.wallet_reserved_balance)
    }

    fn total_available_local_balance(&self) -> Amount {
        self.channels
            .iter()
            .filter(|c| c.active)
            .map(|c| c.available_local_balance())
            .sum()
    }

    fn total_available_remote_balance(&self) -> Amount {
        self.channels
            .iter()
            .filter(|c| c.active)
            .map(|c| c.available_remote_balance())
            .sum()
    }
}

async fn get_gateway_data(
    client: &GatewayRpcClient,
    federation_id: FederationId,
) -> anyhow::Result<GatewayData> {
    let balance = client
        .get_balance(ln_gateway::rpc::BalancePayload { federation_id })
        .await?;
    let info = client.get_info().await?;
    Ok(GatewayData {
        balance,
        info: GatewayInfoSummary {
            lightning_pub_key: info.lightning_pub_key,
            lightning_alias: info.lightning_alias,
        },
    })
}

async fn get_lnd_data(client: LndClient) -> anyhow::Result<LndData> {
    let mut c1 = client.clone();
    let channels_response = c1.lightning().list_channels(ListChannelsRequest {
        ..Default::default()
    });
    let mut c2 = client.clone();
    let info_response = c2.lightning().get_info(GetInfoRequest {});
    let mut c3 = client.clone();
    let peers_response = c3.lightning().list_peers(ListPeersRequest {
        ..Default::default()
    });
    let mut c4 = client.clone();
    let wallet_balance_response = c4.lightning().wallet_balance(WalletBalanceRequest {
        ..Default::default()
    });
    let (channels_response, info_response, peers_response, wallet_balance_response) =
        futures::future::join4(
            channels_response,
            info_response,
            peers_response,
            wallet_balance_response,
        )
        .await;
    let channels_response = channels_response?.into_inner();
    let info_response = info_response?.into_inner();
    let wallet_balance_response = wallet_balance_response?.into_inner();
    let connected_peers = peers_response?
        .into_inner()
        .peers
        .into_iter()
        .map(|peer| (peer.pub_key.clone(), peer))
        .collect::<HashMap<_, _>>();

    let channel_peers_pubkeys = channels_response
        .channels
        .iter()
        .map(|channel| channel.remote_pubkey.to_owned())
        .collect::<HashSet<_>>();
    let peers_with_channels_info = channel_peers_pubkeys
        .into_iter()
        .map(|pub_key| {
            let mut client = client.clone();
            let connected_peers = &connected_peers;
            async move {
                client
                    .lightning()
                    .get_node_info(NodeInfoRequest {
                        pub_key: pub_key.clone(),
                        ..Default::default()
                    })
                    .map_ok_or_else(
                        {
                            let pub_key = pub_key.clone();
                            |e| (pub_key, Err(format!("{e:?}")))
                        },
                        |response| {
                            let connected_peer_info = connected_peers.get(&pub_key).cloned();
                            (
                                pub_key,
                                Ok(NodeInfo::from(response.into_inner(), connected_peer_info)),
                            )
                        },
                    )
                    .await
            }
        })
        .collect::<Vec<_>>();
    let peers_with_channels_info = futures::future::join_all(peers_with_channels_info)
        .await
        .into_iter()
        .collect::<HashMap<_, _>>();
    let channels = channels_response
        .channels
        .into_iter()
        .map(|channel| {
            let node_info = peers_with_channels_info
                .get(&channel.remote_pubkey)
                .cloned();
            ChannelInfo::from(channel, node_info)
        })
        .collect();
    Ok(LndData {
        wallet_total_balance: Amount::from_sats(wallet_balance_response.total_balance as u64),
        wallet_locked_balance: Amount::from_sats(wallet_balance_response.locked_balance as u64),
        wallet_reserved_balance: Amount::from_sats(
            wallet_balance_response.reserved_balance_anchor_chan as u64,
        ),
        synchronized_to_graph: info_response.synced_to_graph,
        synchronized_to_chain: info_response.synced_to_chain,
        peers_with_channels_info,
        channels,
    })
}

pub async fn check_lnd_gateway(
    federation_id: FederationId,
    gateway_clients: Vec<(Url, GatewayRpcClient)>,
    lnd_clients: Vec<(String, LndClient)>,
    state: Arc<RwLock<LndGatewaysState>>,
    limits: MonitorLndGatewaysLimitsArgs,
) -> anyhow::Result<()> {
    let interval_time = CHECK_INTERVAL_TIME;
    loop {
        info!("Checking LND Gateways...");
        let execution_result = async {
            let now = fedimint_core::time::now();
            const GET_GATEWAY_DATA_TIMEOUT: Duration = Duration::from_secs(30);
            let gateway_data_results =
                futures::future::join_all(gateway_clients.iter().map(|(url, client)| {
                    timeout(
                        GET_GATEWAY_DATA_TIMEOUT,
                        get_gateway_data(client, federation_id),
                    )
                    .map_err(|_e| {
                        anyhow::anyhow!(
                            "Timed out while getting gateway data from {:?}",
                            url.clone()
                        )
                    })
                    .and_then(futures::future::ready)
                    .map_err(|e| format!("{e:?}"))
                }));
            const GET_LND_DATA_TIMEOUT: Duration = Duration::from_secs(30);
            let lnd_data_results =
                futures::future::join_all(lnd_clients.iter().map(|(url, client)| {
                    timeout(GET_LND_DATA_TIMEOUT, get_lnd_data(client.clone()))
                        .map_err(|_e| {
                            anyhow::anyhow!(
                                "Timed out while getting lnd data from {:?}",
                                url.clone()
                            )
                        })
                        .and_then(futures::future::ready)
                        .map_err(|e| format!("{e:?}"))
                }));
            let (gateway_data_results, lnd_data_results) =
                futures::future::join(gateway_data_results, lnd_data_results).await;
            let elapsed = now.elapsed()?;
            Ok::<_, anyhow::Error>(LndGatewaysCheckResult::Success {
                duration_ms: elapsed,
                gateway_data_results,
                lnd_data_results,
            })
        }
        .await;
        let result = match execution_result {
            Ok(result) => result,
            Err(e) => {
                warn!("lnd gateways check failed: {e:?}");
                LndGatewaysCheckResult::Failure {
                    error: format!("{e:?}"), // uses the debug formatter to get the backtrace
                }
            }
        };
        let alerts = generate_alerts_for_result(&result, &limits);
        {
            let mut state = state.write().await;
            let check = LndGatewaysCheck {
                result,
                alerts,
                time: fedimint_core::time::now().into(),
            };
            state.checks.push_front(check);
            state.checks.truncate(MAX_CHECKS_TO_KEEP_ON_STATE);
        }
        info!("Sleeping for {interval_time:?}");
        tokio::time::sleep(interval_time).await;
    }
}

#[derive(Debug, Clone, Serialize)]
enum LndGatewaysStatus {
    Ok,
    Alert,
}

pub async fn get_state(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<LndGatewaysState>>>,
) -> (StatusCode, Json<LndGatewaysCheckResponse>) {
    let state = state.read().await.clone();
    let alerts = generate_alerts_for_state(&state);
    let latest_checks = state
        .checks
        .into_iter()
        .take(LATEST_CHECKS_COUNT)
        .collect::<Vec<_>>();
    let status = if alerts.is_empty() {
        LndGatewaysStatus::Ok
    } else {
        LndGatewaysStatus::Alert
    };
    let check_response = LndGatewaysCheckResponse {
        latest_checks,
        alerts,
        status,
    };
    (StatusCode::OK, Json(check_response))
}

pub async fn get_text(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<LndGatewaysState>>>,
) -> (StatusCode, String) {
    let state = state.read().await.clone();
    let alerts = generate_alerts_for_state(&state);
    let (code, mut s) = match format_state(state) {
        Ok(cursor) => (
            StatusCode::OK,
            String::from_utf8(cursor.into_inner()).unwrap(),
        ),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, format!("{e:?}")),
    };
    if !alerts.is_empty() {
        s += "\n\nAlerts:\n";
        for alert in alerts {
            s += &format!("  {}\n", alert);
        }
    }
    (code, s)
}

fn generate_alerts_for_state(state: &LndGatewaysState) -> Vec<String> {
    if state.checks.is_empty() {
        return vec!["No check yet".to_string()];
    }
    let latest = state.checks.front().unwrap();
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

fn generate_alerts_for_result(
    check_result: &LndGatewaysCheckResult,
    limits: &MonitorLndGatewaysLimitsArgs,
) -> Vec<String> {
    let mut results = vec![];
    match check_result {
        LndGatewaysCheckResult::Success {
            duration_ms,
            gateway_data_results,
            lnd_data_results,
        } => {
            if *duration_ms > CHECK_INTERVAL_TIME {
                results.push(format!("Last check took too long, it took {duration_ms:?}"));
            }
            for result in gateway_data_results {
                match result {
                    Ok(gateway_data) => {
                        if gateway_data.balance < limits.minimum_ecash_balance {
                            results.push(format!(
                                "Gateway has less than {} ecash: {}",
                                format_amount(limits.minimum_ecash_balance),
                                format_amount(gateway_data.balance)
                            ));
                        }
                    }
                    Err(e) => {
                        results.push(format!("Error getting gateway data: {e:?}"));
                    }
                }
            }
            for result in lnd_data_results {
                match result {
                    Ok(lnd_data) => {
                        if !lnd_data.synchronized_to_chain {
                            results.push(format!("Lnd is not synchronized to chain"));
                        }
                        if !lnd_data.synchronized_to_graph {
                            results.push(format!("Lnd is not synchronized to graph"));
                        }
                        if lnd_data.available_balance() < limits.minimum_lnd_balance {
                            results.push(format!(
                                "Lnd has less than {}: {}",
                                format_amount(limits.minimum_lnd_balance),
                                format_amount(lnd_data.available_balance())
                            ));
                        }
                        if lnd_data.total_available_local_balance()
                            < limits.minimum_outbound_capacity
                        {
                            results.push(format!(
                                "Lnd has less than {} of outbound capacity: {}",
                                format_amount(limits.minimum_outbound_capacity),
                                format_amount(lnd_data.total_available_local_balance())
                            ));
                        }
                        if lnd_data.total_available_remote_balance()
                            < limits.minimum_inbound_capacity
                        {
                            results.push(format!(
                                "Lnd has less than {} of inbound capacity: {}",
                                format_amount(limits.minimum_inbound_capacity),
                                format_amount(lnd_data.total_available_remote_balance())
                            ));
                        }
                    }
                    Err(e) => {
                        results.push(format!("Error getting lnd data: {e:?}"));
                    }
                }
            }
        }
        LndGatewaysCheckResult::Failure { error } => {
            results.push(format!("Last check failed with error: {error:?}"))
        }
    }
    results
}

fn with_separator(n: u64) -> String {
    n.to_string()
        .as_bytes()
        .rchunks(3)
        .rev()
        .map(std::str::from_utf8)
        .collect::<Result<Vec<&str>, _>>()
        .unwrap()
        .join(",") // separator
}

fn format_amount(amount: Amount) -> String {
    format!("{} sats", with_separator(amount.msats / 1000))
}

pub fn format_state(mut state: LndGatewaysState) -> anyhow::Result<std::io::Cursor<Vec<u8>>> {
    let mut w = std::io::Cursor::new(Vec::new());
    if state.checks.is_empty() {
        write!(w, "No checks yet")?;
        return Ok(w);
    }
    let latest_check = state.checks.pop_front().unwrap();
    let latest_check_time = latest_check.time;
    match latest_check.result {
        LndGatewaysCheckResult::Success {
            duration_ms,
            gateway_data_results,
            lnd_data_results,
        } => {
            writeln!(w, "Gateway data:")?;
            for result in gateway_data_results {
                match result {
                    Ok(result) => {
                        writeln!(w, "  Ecash balance: {}", format_amount(result.balance))?;
                    }
                    Err(e) => {
                        writeln!(w, "{e}")?;
                    }
                }
            }
            writeln!(w, "LND data:")?;
            for result in lnd_data_results {
                match result {
                    Ok(mut result) => {
                        writeln!(
                            w,
                            "  Wallet balance: {}",
                            format_amount(result.available_balance())
                        )?;
                        writeln!(
                            w,
                            "  Synchronized to chain/graph: {}/{}",
                            result.synchronized_to_chain, result.synchronized_to_graph
                        )?;
                        writeln!(w, "Channels: active|inbound|outbound|alias")?;
                        result.channels.sort_by(|a, b| {
                            b.available_remote_balance()
                                .cmp(&a.available_remote_balance())
                        });
                        for channel in &result.channels {
                            writeln!(
                                w,
                                "  {}|{}|{}|{}",
                                channel.active,
                                format_amount(channel.available_remote_balance()),
                                format_amount(channel.available_local_balance()),
                                channel.alias
                            )?;
                        }
                        writeln!(w, "Total available:")?;
                        writeln!(
                            w,
                            "  Inbound: {}",
                            format_amount(result.total_available_remote_balance()),
                        )?;
                        writeln!(
                            w,
                            "  Outbound: {}",
                            format_amount(result.total_available_local_balance())
                        )?;
                    }
                    Err(e) => {
                        writeln!(w, "{e}")?;
                    }
                }
            }
            writeln!(
                w,
                "\nLatest check at {latest_check_time} took {}ms",
                duration_ms.as_millis()
            )?;
        }
        LndGatewaysCheckResult::Failure { error } => {
            writeln!(w, "Error: {error}")?;
        }
    }

    Ok(w)
}
