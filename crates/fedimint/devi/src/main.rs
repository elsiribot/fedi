use clap::{Parser, Subcommand};
use devi::devitrix;
use devimint::cli::CommonArgs;

#[derive(Parser)]
struct Args {
    #[clap(flatten)]
    common: CommonArgs,
    #[clap(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    #[clap(flatten)]
    Devimint(devimint::cli::Cmd),
    #[clap(flatten)]
    DevimintTest(devimint::tests::TestCmd),
    /// Start a Matrix Synapse server and run a command with its environment
    Devitrix(devitrix::DevitrixArgs),
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args: Args = Args::parse();
    match args.cmd {
        Cmd::Devimint(cmd) => {
            std::env::set_var("FM_DISBALE_META_MODULE", "1");
            std::env::set_var("FM_USE_UNKNOWN_MODULE", "0");
            devimint::cli::handle_command(cmd, args.common).await?;
        }
        Cmd::DevimintTest(test_cmd) => {
            devimint::tests::handle_command(test_cmd, args.common).await?
        }
        Cmd::Devitrix(devitrix_args) => devitrix::run_devitrix(devitrix_args, args.common).await?,
    }
    Ok(())
}
