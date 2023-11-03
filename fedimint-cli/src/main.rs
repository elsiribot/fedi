use fedi_social_client::FediSocialClientInit;
use fedimint_cli_v2::FedimintCli;
use stability_pool_client::StabilityPoolClientGen;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FedimintCli::new()?
        .with_default_modules()
        .with_module(FediSocialClientInit)
        .with_module(StabilityPoolClientGen)
        .run()
        .await;
    Ok(())
}
