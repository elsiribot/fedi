use fedi_social_client::FediSocialClientGen;
use fedimint_cli::FedimintCli;
// use stabilitypool::PoolClientGen;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FedimintCli::new()?
        .with_default_modules()
        .with_module(FediSocialClientGen)
        // .with_module(PoolClientGen)
        .run()
        .await;
    Ok(())
}
