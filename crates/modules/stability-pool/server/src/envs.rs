//! Environment variables read by `fedimintd`-family binaries to configure the
//! stability pool v2 module. The constants live here so the module's
//! `get_documented_env_vars` and the binary constructing [`StabilityPoolInit`]
//! can never disagree about the names.

/// Pre-ticks the module in the setup UI (`is_enabled_by_default`).
pub const FM_ENABLE_MODULE_SPV2_ENV: &str = "FM_ENABLE_MODULE_SPV2";

/// Selects test parameters: `OracleConfig::Mock` and a 15s cycle. Read by the
/// binary when constructing [`StabilityPoolInit`], not by the module itself.
pub const FM_SPV2_TEST_PARAMS_ENV: &str = "FM_SPV2_TEST_PARAMS";

/// Overrides the cycle duration in seconds (default 600). Read by the binary
/// when constructing [`StabilityPoolInit`]. Ignored under test params.
pub const FM_SPV2_CYCLE_DURATION_SECS_ENV: &str = "FM_SPV2_CYCLE_DURATION_SECS";
