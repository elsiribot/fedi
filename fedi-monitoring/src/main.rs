use std::{net::SocketAddr, path::PathBuf, str::FromStr, sync::Arc};

use axum::{routing::get, Router};

use clap::{arg, Parser, Subcommand};
use common::parse_node_pub_key;

use fedimint_core::{config::load_from_file, task::RwLock};

use gateway_monitoring::{check_mutinynet, get_status, CheckState};

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
    }

    Ok(())
}
