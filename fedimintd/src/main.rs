use fedi_social_server::FediSocialGen;
use fedimint_core::module::ServerModuleGen;
use fedimintd::fedimintd::Fedimintd;
// use stabilitypool_server::{PoolConfigGenParams, PoolConfigGenerator};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    Fedimintd::new()?
        .with_default_modules()
        .with_module(FediSocialGen)
        // .with_module(PoolConfigGenerator)
        // .with_extra_module_gens_params(PoolConfigGenerator::kind(), PoolConfigGenParams::default())
        .run()
        .await
}
