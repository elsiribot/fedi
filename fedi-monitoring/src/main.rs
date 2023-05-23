use std::{
    collections::{HashMap, VecDeque},
    ffi::OsStr,
    net::SocketAddr,
    path::PathBuf,
    str::FromStr,
    sync::Arc,
    time::{Duration, SystemTime},
};

use anyhow::{anyhow, bail, Context};
use axum::{http::StatusCode, routing::get, Json, Router};
use bitcoin::secp256k1;
use clap::{arg, Parser, Subcommand};
use fedimint_client::{
    module::IPrimaryClientModule, secret::PlainRootSecretStrategy, sm::OperationId,
    transaction::TransactionBuilder, Client, ClientBuilder,
};
use fedimint_core::{
    config::{load_from_file, ClientConfig},
    core::IntoDynInstance,
    module::{CommonModuleGen, __reexports::serde_json},
    task::{timeout, RwLock, TaskGroup},
    Amount, OutPoint, TieredMulti, TieredSummary,
};
use fedimint_ln_client::{LightningClientExt, LightningClientGen, LnPayState};
use fedimint_mint_client::{
    parse_ecash, MintClientExt, MintClientGen, MintClientModule, MintCommonGen, SpendableNote,
};
use fedimint_wallet_client::WalletClientGen;
use futures::StreamExt;
use lightning_invoice::Invoice;
use serde::Serialize;
use tracing::{debug, info, log::warn};

const AMOUNT_TO_REMINT: Amount = Amount::from_msats(1024);
const AMOUNT_TO_PAY: Amount = Amount::from_msats(1000);
/// How many results will be considered on response
const LATEST_CHECKS_COUNT: usize = 12;
/// Should be greater than `LATEST_CHECKS_COUNT`
const MAX_CHECKS_TO_KEEP_ON_STATE: usize = 120;

const CHECK_INTERVAL_TIME: Duration = Duration::from_secs(5 * 60);

const PAY_INVOICE_TIMEOUT: Duration = Duration::from_secs(4 * 60);
const GENERATE_INVOICE_TIMEOUT: Duration = Duration::from_secs(30);

#[derive(Parser, Clone)]
#[command(version)]
struct Opts {
    #[clap(subcommand)]
    command: CliCommand,
}

#[derive(Subcommand, Clone)]
enum CliCommand {
    MutinynetMonitoring {
        #[arg(long, help = "Path of the client config.json")]
        client_config: PathBuf,

        #[arg(
            long,
            help = "Gateway public key. If none, the default gateway will be used"
        )]
        gateway_public_key: Option<String>,

        #[arg(
            long,
            default_value = "0.0.0.0:3000",
            help = "Address to bind/listen to"
        )]
        bind: String,
    },
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
enum CheckResult {
    Success { duration: Duration },
    Failure { error: String },
}

#[derive(Debug, Clone, Serialize)]
struct Check {
    result: CheckResult,
    time: SystemTime,
}

#[derive(Debug, Clone, Serialize, Default)]
struct CheckState {
    checks: VecDeque<Check>,
}

#[derive(Debug, Clone, Serialize)]
enum Status {
    Ok,
    CheckError,
    StaleChecks,
    Empty,
}

#[derive(Debug, Clone, Serialize)]
struct CheckResponse {
    latest_checks: Vec<Check>,
    status: Status,
}

async fn check_mutinynet(
    cfg: ClientConfig,
    gateway_public_key: Option<secp256k1::PublicKey>,
    state: Arc<RwLock<CheckState>>,
) -> anyhow::Result<()> {
    let interval_time = CHECK_INTERVAL_TIME;
    let mut tg = TaskGroup::new();
    let client = build_client(&cfg, &mut tg).await?;
    if let Some(gateway_public_key) = &gateway_public_key {
        client.set_active_gateway(gateway_public_key).await?;
    }

    loop {
        info!("Checking mutinynet...");
        let execution_result = async {
            let summary = get_note_summary(&client).await?;
            if summary.total_amount() <= AMOUNT_TO_REMINT {
                info!("Not enough funds, getting more");
                cmd!(FedimintCli, "fetch").out_string().await?;
                let msats_to_get = AMOUNT_TO_REMINT.msats;
                let notes = cmd!(FedimintCli, "spend", "{msats_to_get}")
                    .out_json()
                    .await?["note"]
                    .as_str()
                    .map(parse_ecash)
                    .transpose()?
                    .ok_or_else(|| anyhow!("no note returned"))?;
                info!("Reissuing notes");
                reissue_notes(&client, notes).await?;
            }
            let notes_quantity = summary
                .iter()
                .find(|(amount, _quantity)| *amount == AMOUNT_TO_REMINT)
                .map(|(_amount, quantity)| quantity)
                .unwrap_or(0);
            if notes_quantity == 0 {
                info!("Reminting notes of denomination {AMOUNT_TO_REMINT}");
                remint_denomination(&client, AMOUNT_TO_REMINT, 1).await?;
            }
            info!("Creating invoice");
            let invoice = match timeout(
                GENERATE_INVOICE_TIMEOUT,
                mutinynet_faucet_create_invoice(AMOUNT_TO_PAY),
            )
            .await
            {
                Ok(Ok(invoice)) => invoice,
                Ok(Err(e)) => bail!("Failed to create invoice: {e}"),
                Err(_) => bail!("Timed out while creating invoice"),
            };
            debug!("Invoice: {:?}", invoice);
            info!("Paying invoice");
            let now = fedimint_core::time::now();
            match timeout(PAY_INVOICE_TIMEOUT, gateway_pay_invoice(&client, invoice)).await {
                Ok(Ok(())) => info!("Invoice paid"),
                Ok(Err(e)) => bail!("Failed to pay invoice: {e}"),
                Err(_) => bail!("Timed out while paying invoice"),
            };
            let elapsed = now.elapsed()?;
            Ok::<_, anyhow::Error>(elapsed)
        }
        .await;
        let result = match execution_result {
            Ok(elapsed) => CheckResult::Success { duration: elapsed },
            Err(e) => {
                warn!("Mutinynet check failed: {e}");
                CheckResult::Failure {
                    error: e.to_string(),
                }
            }
        };
        {
            let mut state = state.write().await;
            state.checks.push_front(Check {
                result,
                time: SystemTime::now(),
            });
            state.checks.truncate(MAX_CHECKS_TO_KEEP_ON_STATE);
        }
        info!("Sleeping for {interval_time:?}");
        tokio::time::sleep(interval_time).await;
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fedimint_logging::TracingSetup::default().init()?;
    let opts = Opts::parse();
    let check_state = Arc::new(RwLock::new(CheckState::default()));
    match opts.command {
        CliCommand::MutinynetMonitoring {
            client_config,
            gateway_public_key,
            bind,
        } => {
            let cfg = load_from_file(&client_config)?;
            let gateway_public_key = gateway_public_key
                .map(|g| parse_node_pub_key(&g))
                .transpose()?;
            let daemon = tokio::spawn(check_mutinynet(
                cfg,
                gateway_public_key,
                Arc::clone(&check_state),
            ));
            let app = Router::new()
                .route("/mutinynet_status", get(get_mutininynet_status))
                .with_state(check_state);

            let addr = SocketAddr::from_str(&bind)?;
            axum::Server::bind(&addr)
                .serve(app.into_make_service())
                .await?;
            daemon.await??;
        }
    }

    Ok(())
}

async fn get_mutininynet_status(
    axum::extract::State(state): axum::extract::State<Arc<RwLock<CheckState>>>,
) -> (StatusCode, Json<CheckResponse>) {
    let check_state = state.read().await.clone();
    let latest_checks = check_state
        .checks
        .into_iter()
        .take(LATEST_CHECKS_COUNT)
        .collect::<Vec<_>>();
    let status = if latest_checks.is_empty() {
        Status::Empty
    } else if latest_checks
        .iter()
        .all(|check| matches!(check.result, CheckResult::Success { .. }))
    {
        let has_recent_checks = latest_checks
            .iter()
            .any(|check| check.time.elapsed().unwrap() <= CHECK_INTERVAL_TIME * 2);
        if has_recent_checks {
            Status::Ok
        } else {
            Status::StaleChecks
        }
    } else {
        Status::CheckError
    };
    let check_response = CheckResponse {
        latest_checks,
        status,
    };

    (StatusCode::OK, Json(check_response))
}

async fn mutinynet_faucet_create_invoice(amount: Amount) -> anyhow::Result<Invoice> {
    let sats = amount.msats / 1000;
    let mut map = HashMap::new();
    map.insert("amount", sats.to_string());

    let client = reqwest::Client::new();
    let res = client
        .post("https://faucet.mutinynet.dev.fedibtc.com/api/create-invoice")
        .json(&map)
        .send()
        .await?;

    let response: serde_json::Value = res.json().await?;
    let invoice = Invoice::from_str(
        response["bolt11"]
            .as_str()
            .ok_or_else(|| anyhow!("Missing bolt11 field on faucet create invoice response"))?,
    )?;

    Ok(invoice)
}

async fn build_client(cfg: &ClientConfig, tg: &mut TaskGroup) -> anyhow::Result<Client> {
    let mut client_builder = ClientBuilder::default();
    client_builder.with_module(MintClientGen);
    client_builder.with_module(LightningClientGen);
    client_builder.with_module(WalletClientGen);
    client_builder.with_primary_module(1);
    client_builder.with_config(cfg.clone());
    let db = fedimint_core::db::mem_impl::MemDatabase::new();
    client_builder.with_database(db);
    let client = client_builder.build::<PlainRootSecretStrategy>(tg).await?;
    Ok(client)
}

async fn remint_denomination(
    client: &Client,
    denomination: Amount,
    quantity: u16,
) -> anyhow::Result<()> {
    let (mint_client, client_module_instance) =
        client.get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
    let mut dbtx = client.db().begin_transaction().await;
    let mut module_transaction = dbtx.with_module_prefix(client_module_instance.id);
    let mut tx = TransactionBuilder::new();
    let operation_id = OperationId::new_random();
    for _ in 0..quantity {
        let output = mint_client
            .create_output(&mut module_transaction, operation_id, 1, denomination)
            .await;
        tx = tx.with_output(output.into_dyn(client_module_instance.id));
    }
    drop(module_transaction);
    let operation_meta_gen = |_txid, _outpoint| ();
    let txid = client
        .finalize_and_submit_transaction(
            operation_id,
            MintCommonGen::KIND.as_str(),
            operation_meta_gen,
            tx,
        )
        .await?;
    let tx_subscription = client.transaction_updates(operation_id).await;
    tx_subscription.await_tx_accepted(txid).await?;
    dbtx.commit_tx().await;
    for i in 0..quantity {
        let out_point = OutPoint {
            txid,
            out_idx: i as u64,
        };
        mint_client
            .await_primary_module_output_finalized(operation_id, out_point)
            .await?;
    }
    Ok(())
}

async fn get_note_summary(client: &Client) -> anyhow::Result<TieredSummary> {
    let (mint_client, _) = client.get_first_module::<MintClientModule>(&fedimint_mint_client::KIND);
    let summary = mint_client
        .get_wallet_summary(&mut client.db().begin_transaction().await.with_module_prefix(1))
        .await;
    Ok(summary)
}

async fn reissue_notes(client: &Client, notes: TieredMulti<SpendableNote>) -> anyhow::Result<()> {
    let operation_id = client.reissue_external_notes(notes, ()).await?;
    let mut updates = client
        .subscribe_reissue_external_notes_updates(operation_id)
        .await?
        .into_stream();
    while let Some(update) = updates.next().await {
        if let fedimint_mint_client::ReissueExternalNotesState::Failed(e) = update {
            return Err(anyhow::Error::msg(format!("Reissue failed: {e}")));
        }
    }
    Ok(())
}

async fn gateway_pay_invoice(client: &Client, invoice: Invoice) -> anyhow::Result<()> {
    let operation_id = client
        .pay_bolt11_invoice(client.federation_id(), invoice)
        .await?;
    let mut updates = client
        .subscribe_ln_pay_updates(operation_id)
        .await?
        .into_stream();
    while let Some(update) = updates.next().await {
        info!("LnPayState update: {:?}", update);
        match update {
            LnPayState::Success { preimage: _ } => {
                break;
            }
            LnPayState::Created | LnPayState::Funded | LnPayState::AwaitingChange => {}
            other => bail!("Failed to pay invoice: {other:?}"),
        }
    }
    Ok(())
}

fn parse_node_pub_key(s: &str) -> Result<secp256k1::PublicKey, secp256k1::Error> {
    secp256k1::PublicKey::from_str(s)
}

struct FedimintCli;
impl ToCmdExt for FedimintCli {
    type Fut = std::future::Ready<Command>;

    fn cmd(self) -> Self::Fut {
        // try to use alias if set
        let fedimint_cli = std::env::var("FM_MINT_CLIENT")
            .map(|s| s.split_whitespace().map(ToOwned::to_owned).collect())
            .unwrap_or_else(|_| vec!["fedimint-cli".into()]);
        let mut cmd = tokio::process::Command::new(&fedimint_cli[0]);
        cmd.args(&fedimint_cli[1..]);
        std::future::ready(Command {
            cmd,
            args_debug: fedimint_cli,
        })
    }
}

#[macro_export]
macro_rules! cmd {
    ($(@head ($($head:tt)* ))? $curr:literal $(, $($tail:tt)*)?) => {
        cmd! {
            @head ($($($head)*)? format!($curr),)
            $($($tail)*)?
        }
    };
    ($(@head ($($head:tt)* ))? $curr:expr $(, $($tail:tt)*)?) => {
        cmd! {
            @head ($($($head)*)? $curr,)
            $($($tail)*)?
        }
    };
    (@head ($($head:tt)* )) => {
        cmd! {
            @last
            $($head)*
        }
    };
    // last matcher
    (@last $this:expr, $($arg:expr),* $(,)?) => {
        {
            #[allow(unused)]
            use $crate::ToCmdExt;
            $this.cmd().await
                $(.arg($arg))*
                .kill_on_drop(true)
                .env("RUST_BACKTRACE", "1")
        }
    };
}

pub trait ToCmdExt {
    type Fut;
    fn cmd(self) -> Self::Fut;
}

// a command that uses self as program name
impl ToCmdExt for &'_ str {
    type Fut = std::future::Ready<Command>;

    fn cmd(self) -> Self::Fut {
        std::future::ready(Command {
            cmd: tokio::process::Command::new(self),
            args_debug: vec![self.to_owned()],
        })
    }
}

pub struct Command {
    pub cmd: tokio::process::Command,
    pub args_debug: Vec<String>,
}

impl Command {
    pub fn arg<T: ToString>(mut self, arg: T) -> Self {
        let string = arg.to_string();
        self.cmd.arg(string.clone());
        self.args_debug.push(string);
        self
    }

    pub fn env<K, V>(mut self, key: K, val: V) -> Self
    where
        K: AsRef<OsStr>,
        V: AsRef<OsStr>,
    {
        self.cmd.env(key, val);
        self
    }

    pub fn envs<I, K, V>(mut self, env: I) -> Self
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<OsStr>,
        V: AsRef<OsStr>,
    {
        self.cmd.envs(env);
        self
    }

    pub fn kill_on_drop(mut self, kill: bool) -> Self {
        self.cmd.kill_on_drop(kill);
        self
    }

    /// Run the command and get its output as json.
    pub async fn out_json(&mut self) -> anyhow::Result<serde_json::Value> {
        Ok(serde_json::from_str(&self.out_string().await?)?)
    }

    fn command_debug(&self) -> String {
        self.args_debug
            .iter()
            .map(|x| x.replace(' ', "␣"))
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Run the command and get its output as json.
    pub async fn out_string(&mut self) -> anyhow::Result<String> {
        let output = self
            .run_inner()
            .await
            .with_context(|| format!("command: {}", self.command_debug()))?;
        let output = String::from_utf8(output.stdout)?;
        Ok(output.trim().to_owned())
    }

    pub async fn run_inner(&mut self) -> anyhow::Result<std::process::Output> {
        debug!("> {}", self.command_debug());
        let output = self.cmd.output().await?;
        if !output.status.success() {
            bail!(
                "{}\nstdout:\n{}\nstderr:\n{}",
                output.status,
                String::from_utf8_lossy(&output.stdout),
                String::from_utf8_lossy(&output.stderr),
            );
        }
        Ok(output)
    }

    /// Run the command ignoring its output.
    pub async fn run(&mut self) -> anyhow::Result<()> {
        let _ = self
            .run_inner()
            .await
            .with_context(|| format!("command: {}", self.command_debug()))?;
        Ok(())
    }

    // /// Run the command logging the output and error
    // pub async fn run_with_logging(&mut self, name: String) -> anyhow::Result<()> {
    //     let logs_dir = env::var("FM_LOGS_DIR")?;
    //     let path = format!("{logs_dir}/{name}.log");
    //     let log = OpenOptions::new()
    //         .append(true)
    //         .create(true)
    //         .open(path)
    //         .await?
    //         .into_std()
    //         .await;
    //     self.cmd.stdout(log.try_clone()?);
    //     self.cmd.stderr(log);
    //     let status = self.cmd.spawn()?.wait().await?;
    //     if !status.success() {
    //         bail!("{}", status);
    //     }
    //     Ok(())
    // }
}
