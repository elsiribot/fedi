use fedi_social_client::FediSocialClientInit;
use fedimint_cli::FedimintCli;
use stability_pool_client::StabilityPoolClientInit;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FedimintCli::new()?
        .with_default_modules()
        .with_module(FediSocialClientInit)
        .with_module(StabilityPoolClientInit)
        .run()
        .await;
    Ok(())
}
