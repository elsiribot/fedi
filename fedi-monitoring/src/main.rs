use std::{cmp::max, net::SocketAddr, path::PathBuf, str::FromStr, sync::Arc, time::Duration};

use anyhow::bail;
use axum::{routing::get, Router};

use clap::{arg, Args, Parser, Subcommand};
use common::{parse_node_pub_key, try_mutinynet_faucet_create_invoice};

use fedimint_core::{
    config::load_from_file,
    task::{timeout, RwLock},
    Amount,
};

use gateway_monitoring::{check_mutinynet, get_status, CheckState};
use tokio::io::AsyncWriteExt;
use tracing::{debug, info};

use crate::common::{refill_cli_wallet_if_needed, try_cli_get_notes_string};

pub mod common;
pub mod gateway_monitoring;

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
    #[command(
        about = "This is just a wrapper to run the load test on mutinynet. It could be a bash script, but rust is better"
    )]
    RunMutinynetLoadTest(MutinynetLoadTestArgs),
}

#[derive(Clone, Args)]
struct MutinynetLoadTestArgs {
    #[arg(
        long,
        env = "LT_USERS_NUMBER",
        help = "Number of users. Each user will work in parallel"
    )]
    users: u16,

    #[arg(
        long,
        env = "LT_CLI_USER",
        help = "User to run the load test with. This is just a sanity check to avoiding running the load test as root or some random user"
    )]
    user_to_run_with: String,

    #[arg(
        long,
        env = "LT_CLI_DATA_DIR",
        help = "fedimint-cli data dir. Will try to get funds from this client"
    )]
    fm_client_datadir: PathBuf,

    #[arg(
        long,
        env = "LT_CLI_ARCHIVE_DIR",
        help = "Directory where the load test results will be saved"
    )]
    load_test_archive_dir: PathBuf,

    #[arg(
        long,
        help = "Additional output with the metrics results in JSON format, besides the one in the archive dir"
    )]
    additional_metrics_json_output: Option<PathBuf>,

    #[arg(
        long,
        default_value = "1",
        help = "How many invoices will be created for each user"
    )]
    invoices_per_user: u16,

    #[arg(
        long,
        help = "How many notes to distribute to each user",
        default_value = "1"
    )]
    notes_per_user: u16,

    #[arg(
        long,
        help = "Note denomination to use for the test",
        default_value = "1024"
    )]
    note_denomination: Amount,

    #[arg(
        long,
        help = "Minimum amount to refill the wallet with the faucet when needed, in msats",
        default_value = "1000000"
    )]
    minimum_amount_refill: Amount,
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
                .route("/mutinynet_status", get(get_status))
                .with_state(check_state);

            let addr = SocketAddr::from_str(&bind)?;
            axum::Server::bind(&addr)
                .serve(app.into_make_service())
                .await?;
            daemon.await??;
        }
        CliCommand::RunMutinynetLoadTest(args) => run_mutinynet_load_test(args).await?,
    }

    Ok(())
}

async fn run_mutinynet_load_test(args: MutinynetLoadTestArgs) -> anyhow::Result<()> {
    if cmd!("whoami").out_string().await?.trim() != args.user_to_run_with {
        bail!(
            "This script should be run as '{}' user or another user should be given with --user-to-run-with",
            args.user_to_run_with
        )
    }
    if !args.fm_client_datadir.is_dir() {
        bail!("There is no {:?}", args.fm_client_datadir)
    }
    std::env::set_var(
        "FM_MINT_CLIENT",
        format!(
            "fedimint-cli --data-dir {}",
            args.fm_client_datadir.display()
        ),
    );
    const INVOICE_VALUE: Amount = Amount::from_sats(1);
    let amount_required_by_reissue =
        args.users as u64 * args.notes_per_user as u64 * args.note_denomination.msats;
    let amount_required_by_invoices =
        args.users as u64 * args.invoices_per_user as u64 * INVOICE_VALUE.msats;
    let notes_amount_required =
        Amount::from_msats(max(amount_required_by_reissue, amount_required_by_invoices));
    // Check if there is enough funds in the wallet
    refill_cli_wallet_if_needed(notes_amount_required, args.minimum_amount_refill).await?;
    let invoices_output_file_name = tempfile::NamedTempFile::new()?;
    let mut invoices_output_file =
        tokio::io::BufWriter::new(tokio::fs::File::create(&invoices_output_file_name).await?);
    const INVOICE_RETRIES: usize = 50;
    const INVOICE_OPERATION_TIMEOUT: Duration = Duration::from_secs(120);
    let mut invoices_count = 0;
    info!("Creating invoices");
    for _ in 0..args.users {
        for _ in 0..args.invoices_per_user {
            let invoice = match timeout(
                INVOICE_OPERATION_TIMEOUT,
                try_mutinynet_faucet_create_invoice(&INVOICE_VALUE, INVOICE_RETRIES),
            )
            .await
            {
                Ok(Ok(invoice)) => invoice,
                Ok(Err(e)) => bail!("Failed to create invoice: {e:?}"),
                Err(_) => bail!("Failed to create invoice: timeout"),
            };
            debug!("Created invoice: {invoice}");
            invoices_output_file
                .write_all(format!("{invoice}\n").as_bytes())
                .await?;
            invoices_count += 1;
        }
    }
    invoices_output_file.flush().await?;
    drop(invoices_output_file);
    debug!("Saved {invoices_count} invoices to {invoices_output_file_name:?}");
    const GET_NOTES_RETRIES: usize = 10;
    info!("Getting {notes_amount_required} notes from the client");
    let serialized_notes =
        try_cli_get_notes_string(&notes_amount_required, GET_NOTES_RETRIES).await?;
    let mut load_test_tool = tokio::process::Command::new("fedimint-load-test-tool");
    load_test_tool
        .arg("--archive-dir")
        .arg(args.load_test_archive_dir)
        .arg("--users")
        .arg(args.users.to_string());
    if let Some(metrics_json_output) = args.additional_metrics_json_output {
        load_test_tool
            .arg("--metrics-json-output")
            .arg(metrics_json_output);
    }
    load_test_tool
        .arg("load-test")
        .arg("--invoices-file")
        .arg(invoices_output_file_name.path())
        .arg("--initial-notes")
        .arg(serialized_notes)
        .arg("--client-config")
        .arg(args.fm_client_datadir.join("client.json"))
        .arg("--notes-per-user")
        .arg(args.notes_per_user.to_string())
        .arg("--note-denomination")
        .arg(args.note_denomination.msats.to_string());
    info!("Running load test with {load_test_tool:?}");
    let status = load_test_tool.status().await?;
    if status.success() {
        info!("Load test finished successfully");
    } else {
        bail!("Load test failed with status: {:?}", status.code())
    }
    Ok(())
}
