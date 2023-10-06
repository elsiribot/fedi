use std::time::Duration;

use fedi_social_common::config::FediSocialGenParams;
use fedi_social_server::FediSocialGen;
use fedimint_core::Amount;
use fedimintd::fedimintd::Fedimintd;
use stability_pool_server::common::config::{
    CollateralRatio, OracleConfig, StabilityPoolGenParams, StabilityPoolGenParamsConsensus,
};
use stability_pool_server::StabilityPoolGen;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    Fedimintd::new()?
        .with_default_modules()
        .with_module(FediSocialGen)
        .with_module(StabilityPoolGen)
        .with_extra_module_inits_params(3, fedi_social_common::KIND, FediSocialGenParams::new())
        .with_extra_module_inits_params(
            4,
            stability_pool_server::common::KIND,
            StabilityPoolGenParams {
                local: Default::default(),
                consensus: StabilityPoolGenParamsConsensus {
                    // oracle_config: OracleConfig::Aggregate, // switch oracle when not testing
                    oracle_config: OracleConfig::Mock,
                    cycle_duration: Duration::from_secs(15),
                    collateral_ratio: CollateralRatio {
                        provider: 1,
                        seeker: 1,
                    },
                    min_allowed_seek: Amount::from_msats(100_000),
                    min_allowed_provide: Amount::from_msats(100_000),
                    max_allowed_provide_fee_rate_ppb: 2000,
                    min_allowed_cancellation_bps: 100,
                },
            },
        )
        .run()
        .await
}
