use fedi_social_common::config::FediSocialGenParams;
use fedi_social_server::FediSocialGen;
use fedimintd::distributed_gen::DistributedGen;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    DistributedGen::new()?
        .with_default_modules()
        .with_module(FediSocialGen)
        .with_extra_module_gens_params(3, fedi_social_common::KIND, FediSocialGenParams)
        .run()
        .await
}
