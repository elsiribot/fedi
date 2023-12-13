use std::ffi::OsStr;
use std::path::PathBuf;

use anyhow::Context;
use bitcoin::Address;
use clap::{Args, Parser, Subcommand, ValueEnum};
use federations::federation_command;
use futures::future::{join_all, JoinAll};
use futures::Future;
use meta::{edit_meta_json, show_meta_json};
use serde::{Deserialize, Serialize};
use tokio::process::Command;
use tracing_subscriber::filter::LevelFilter;
use tracing_subscriber::prelude::*;
use tracing_subscriber::{fmt, EnvFilter};

mod federations;
mod meta;
mod remote;

#[derive(Parser, Clone)]
#[command(version)]
struct Opts {
    #[clap(subcommand)]
    command: CliCommand,
}

#[derive(Subcommand, Clone)]
enum CliCommand {
    #[command(about = "Edit a meta.json file")]
    EditMetaJson(EditMetaJsonArgs),
    #[command(about = "Show information about a meta.json file")]
    ShowMetaJson(ShowMetaJsonArgs),
    #[command(about = "Provides utilities to interact with federations")]
    Federation(FederationArgs),
}

#[derive(Clone, Args)]
struct EditMetaJsonArgs {
    #[command(flatten)]
    remote_file_args: RemoteFileArgs,
    #[clap(subcommand)]
    command: EditMetaJsonCommand,
}

#[derive(Clone, Args)]
struct RemoteFileArgs {
    #[command(flatten)]
    ssh_args: SshArgs,
    #[arg(long, help = "Remote path to meta.json")]
    remote_path: PathBuf,
}

#[derive(Clone, Args)]
struct ShowMetaJsonArgs {
    #[command(flatten)]
    remote_file_args: RemoteFileArgs,
    #[clap(subcommand)]
    command: ShowMetaJsonCommand,
}

#[derive(Debug, Clone, Args)]
pub struct SshArgs {
    #[arg(long, short = 'J', help = "SSH jump host")]
    jump_host: Option<String>,
    #[arg(long = "ssh", help = "SSH host to connect to")]
    destination_host: String,
}

#[derive(Subcommand, Clone)]
enum EditMetaJsonCommand {
    #[command(about = "Add a site to list of sites")]
    AddSite(AddSiteArgs),
    #[command(about = "Update a specific site in the list of sites")]
    UpdateSite(UpdateSiteArgs),
    #[command(about = "Remove a site from the list of sites")]
    RemoveSite(RemoveSiteArgs),
    #[command(about = "Add a group chat to the list of default group chats")]
    AddDefaultGroupChat(AddDefaultGroupChatArgs),
    #[command(about = "Remove a group chat from the list of default group chats")]
    RemoveDefaultGroupChat(RemoveDefaultGroupChatArgs),
    #[command(about = "Set a key/value pair in the federation config")]
    SetKeyValue(SetKeyValueArgs),
    #[command(about = "Set a key/value from a set of special keys")]
    SetSpecialKeyValue(SetSpecialKeyValueArgs),
    #[command(about = "Create a new federation from an existing one")]
    DuplicateExisting(DuplicateExistingArgs),
    AddKeysPrefix(AddKeysPrefixArgs),
    RemoveKeysPrefix(RemoveKeysPrefixArgs),
}

#[derive(Subcommand, Clone)]
enum ShowMetaJsonCommand {
    ListFederations(ListFederationsArgs),
}

#[derive(Clone, Args)]
struct DuplicateExistingArgs {
    #[command(flatten)]
    existing_reference: FederationReferenceOptional,
    #[clap(subcommand)]
    command: DuplicateExistingSubCommand,
}

#[derive(Subcommand, Clone)]
enum DuplicateExistingSubCommand {
    As(AsArgs),
}

#[derive(Clone, Args)]
struct AsArgs {
    #[command(flatten)]
    new_reference: FederationReferenceRequired,
}

#[derive(Clone, Args)]
struct AddKeysPrefixArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long, help = "Change the keys to have a prefix (e.g `fedi:`)")]
    prefix: String,
}

#[derive(Clone, Args)]
struct RemoveKeysPrefixArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long, help = "Change the keys to remove a prefix (e.g `fedi:`)")]
    prefix: String,
}

#[derive(Clone, Args)]
struct FederationReferenceOptional {
    #[arg(long)]
    federation_id: Option<String>,
    #[arg(long)]
    federation_name: Option<String>,
}

#[derive(Clone, Args)]
struct FederationReferenceRequired {
    #[arg(long)]
    federation_id: String,
    #[arg(long)]
    federation_name: String,
}

#[derive(Clone, Args)]
struct AddSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: String,
    #[arg(long)]
    title: String,
    #[arg(long)]
    url: String,
    #[arg(long)]
    image_url: String,
    #[arg(long)]
    position: Option<usize>,
}

#[derive(Clone, Args)]
struct UpdateSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: String,
    #[arg(long)]
    title: Option<String>,
    #[arg(long)]
    url: Option<String>,
    #[arg(long)]
    image_url: Option<String>,
    #[arg(long)]
    position: Option<usize>,
}

#[derive(Clone, Args)]
struct RemoveSiteArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    id: Vec<String>,
}

#[derive(Clone, Args)]
struct AddDefaultGroupChatArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    group_chat: String,
}

#[derive(Clone, Args)]
struct RemoveDefaultGroupChatArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    group_chat: String,
}

#[derive(Clone, Args)]
struct SetKeyValueArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[arg(long)]
    key: String,
    #[arg(long)]
    value: String,
    #[arg(long, action)]
    create_new: bool,
}

#[derive(Clone, Args)]
struct SetSpecialKeyValueArgs {
    #[command(flatten)]
    federation_reference: FederationReferenceOptional,
    #[clap(subcommand)]
    command: SetSpecialKeyValueSubCommand,
}

#[derive(Subcommand, Clone)]
enum SetSpecialKeyValueSubCommand {
    #[command(about = "Set the popup end timestamp")]
    PopupEndTimestamp(PopupEndTimestampArgs),
}

#[derive(Clone, Args)]
struct PopupEndTimestampArgs {
    #[arg(long)]
    year: u16,
    #[arg(long)]
    month: u8,
    #[arg(long)]
    day: u8,
    #[arg(long, help = "Something like America/New_York")]
    tz: String,
}

#[derive(Clone, Args)]
struct ListFederationsArgs;

#[derive(Clone, Debug, Deserialize, Serialize)]
struct Site {
    id: String,
    url: String,
    title: String,
    #[serde(rename = "imageUrl")]
    image_url: Option<String>,
}

#[derive(Clone, Args)]
struct FederationArgs {
    #[arg(long, short = 'J', env = "AWS_JUMP_HOST")]
    jump_host: Option<String>,
    #[arg(long, env = "AWS_SSH_USER", default_value = "operator")]
    ssh_user: String,
    #[arg(
        long,
        env = "AWS_HOST_ADDRESS_SUFFIX",
        default_value = "dev.fedibtc.com"
    )]
    host_address_suffix: String,
    #[arg(long, action)]
    ignore_gateways: bool,
    #[arg(long)]
    name: String,
    #[clap(subcommand)]
    command: FederationSubCommand,
}

#[derive(Subcommand, Clone)]
enum FederationSubCommand {
    #[command(about = "Shows a summary of the federation funds balance")]
    FundsSummary(FundsSummaryArgs),
    #[command(about = "Recover funds from a federation after running `funds-summary`")]
    RecoverFederationFunds(RecoverFederationFundsArgs),
    #[command(about = "Recover funds from a gateway after running `funds-summary`")]
    RecoverLightningFunds(RecoverLightningFundsArgs),
    #[command(about = "Restart fedimints")]
    RestartFedimints(RestartFedimintsArgs),
    #[command(about = "Start fedimints")]
    StartFedimints(StartFedimintsArgs),
    #[command(about = "Stop fedimints")]
    StopFedimints(StopFedimintsArgs),
    #[command(about = "Pause npcnix")]
    PauseNpcnix(PauseNpcnixArgs),
}

/// Parse a single key-value pair
fn parse_key_val<T, U>(s: &str) -> anyhow::Result<(T, U)>
where
    T: std::str::FromStr,
    T::Err: std::error::Error + Send + Sync + 'static,
    U: std::str::FromStr,
    U::Err: std::error::Error + Send + Sync + 'static,
{
    let pos = s
        .find('=')
        .with_context(|| format!("invalid KEY=value: no `=` found in `{s}`"))?;
    Ok((s[..pos].parse()?, s[pos + 1..].parse()?))
}

#[derive(Clone, Args)]
struct FundsSummaryArgs {
    #[arg(long, default_value = "/var/lib/fedimint")]
    fedimint_remote_dir: PathBuf,

    #[arg(long, help = "Will save a backup of the federation files here")]
    local_backup_directory: PathBuf,

    #[arg(
        long,
        help = "This will be used to prefix/suffix some names. If not provided it will default to the current UNIX timestamp"
    )]
    wallet_base_id: Option<String>,

    #[arg(long)]
    local_recovery_tool: PathBuf,

    #[arg(
        long,
        help = "use machine_name=pass multiple times, like --recovery-password alpha=alphapass --recovery-password bravo=bravopass etc",
        value_parser = parse_key_val::<String, String>
    )]
    recovery_password: Vec<(String, String)>,

    #[arg(long, default_value_t = RecoveryMethodArgs::All)]
    recovery_method: RecoveryMethodArgs,

    #[arg(long, action, help = "Restart fedimints after calculating balance")]
    restart_fedimints: bool,

    #[clap(subcommand)]
    command: FundsSummarySubCommand,
}

#[derive(Clone, Args)]
struct RecoverFederationFundsArgs {
    #[arg(
        long,
        help = "This command should run after funds-summary was run and use the same wallet_base_id so the remote wallet can be found"
    )]
    wallet_base_id: String,

    #[arg(
        long,
        help = "The bitcoin address destination of all the funds recovered"
    )]
    destination_address: Address,

    #[arg(
        long,
        action,
        help = "If enabled will broadcast the created transaction using the remote bitcoin node"
    )]
    broadcast_transaction: bool,

    #[clap(subcommand)]
    command: RecoverFederationFundsSubCommand,
}

#[derive(Subcommand, Clone, Debug)]
enum RecoverFederationFundsSubCommand {
    UsingRemoteBitcoin(UsingRemoteBitcoinArgs),
}

#[derive(Subcommand, Clone, Debug)]
enum FundsSummarySubCommand {
    UsingRemoteBitcoin(UsingRemoteBitcoinArgs),
    NoBitcoinWallet(NoBitcoinWalletArgs),
}

#[derive(Clone, Args)]
struct RecoverLightningFundsArgs {
    #[arg(
        long,
        help = "The bitcoin address destination of all the funds recovered"
    )]
    destination_address: Address,

    #[arg(
        long,
        help = "Used to calculate fees. Same as --conf_target on LND",
        default_value_t = 1
    )]
    conf_target: u16,

    #[arg(long, action)]
    keep_channels: bool,

    #[arg(long, action)]
    allow_force_close: bool,
}

#[derive(Clone, Args, Debug)]
struct UsingRemoteBitcoinArgs {
    #[command(flatten)]
    remote_bitcoin_ssh_args: SshArgs,

    #[command(flatten)]
    bitcoin_cli_args: BitcoinCliArgs,
}

#[derive(Clone, Args, Debug)]
struct NoBitcoinWalletArgs;

#[derive(Clone, Args, Debug)]
pub struct BitcoinCliArgs {
    #[arg(long)]
    rpcuser: Option<String>,
    #[arg(long)]
    rpcpassword: Option<String>,
    #[arg(long, default_value = "bitcoin-cli")]
    bitcoin_cli: PathBuf,
}

#[derive(Clone, Args)]
struct RestartFedimintsArgs;

#[derive(Clone, Args)]
struct StartFedimintsArgs;

#[derive(Clone, Args)]
struct StopFedimintsArgs;

#[derive(Clone, Args)]
struct PauseNpcnixArgs {
    #[arg(long, action)]
    skip_gateways: bool,
}

#[derive(Copy, Clone, Debug, ValueEnum)]
enum RecoveryMethodArgs {
    Utxos,
    Epochs,
    All,
}

impl ToString for RecoveryMethodArgs {
    fn to_string(&self) -> String {
        match self {
            RecoveryMethodArgs::Utxos => "utxos",
            RecoveryMethodArgs::Epochs => "epochs",
            RecoveryMethodArgs::All => "all",
        }
        .to_string()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(fmt::layer())
        .with(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env_lossy(),
        )
        .init();
    let opts = Opts::parse();
    match opts.command {
        CliCommand::EditMetaJson(args) => edit_meta_json(args).await?,
        CliCommand::ShowMetaJson(args) => show_meta_json(args).await?,
        CliCommand::Federation(args) => federation_command(args).await?,
    };
    Ok(())
}

pub fn new_piped_command<S: AsRef<OsStr>>(program: S) -> Command {
    let mut command = Command::new(program);
    command.stdout(std::process::Stdio::piped());
    command.stderr(std::process::Stdio::piped());
    command.stdin(std::process::Stdio::piped());
    command
}

pub fn run_parallel<I>(iter: I) -> JoinAll<I::Item>
where
    I: IntoIterator,
    I::Item: Future,
{
    join_all(iter)
}

pub async fn run_sequentially<I>(
    iter: I,
) -> Vec<<<I as IntoIterator>::Item as std::future::IntoFuture>::Output>
where
    I: IntoIterator,
    I::Item: Future,
{
    let mut results = Vec::new();
    for future in iter {
        results.push(future.await);
    }
    results
}
