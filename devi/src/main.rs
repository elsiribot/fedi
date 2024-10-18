use clap::{Parser, Subcommand};
use devimint::cli::CommonArgs;
use devimint::envs::FM_FEDIMINTD_BASE_EXECUTABLE_ENV;

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
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args: Args = Args::parse();
    match args.cmd {
        Cmd::Devimint(cmd) => {
            std::env::set_var("FM_DISBALE_META_MODULE", "1");
            std::env::set_var("FM_USE_UNKNOWN_MODULE", "0");
            std::env::set_var(FM_FEDIMINTD_BASE_EXECUTABLE_ENV, "fedi-fedimintd");
            devimint::cli::handle_command(cmd, args.common).await?;
        }
    }
    Ok(())
}
