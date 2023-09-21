use fedi_social_client::FediSocialClientInit;
use fedimint_cli::FedimintCli;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    FedimintCli::new()?
        .with_default_modules()
        .with_module(FediSocialClientInit)
        .run()
        .await;
    Ok(())
}
