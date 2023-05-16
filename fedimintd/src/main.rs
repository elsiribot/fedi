use fedi_social_server::FediSocialGen;
use fedimintd::fedimintd::Fedimintd;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    Fedimintd::new()?
        .with_default_modules()
        .with_module(FediSocialGen)
        .run()
        .await
}
