#!/usr/bin/env bash
set -euo pipefail

export INCLUDE_STABILITY_POOL=1
export USE_STABILITY_POOL_TEST_PARAMS=1
export RUST_BACKTRACE=full

# fedi packages
source scripts/build.sh ""
echo "Running in temporary directory $FM_TEST_DIR"

export FM_ADMIN_PASSWORD=p

function run_tests() {
    FM_INVITE_CODE=$(cat $FM_CLIENT_DIR/invite-code)
    export FM_INVITE_CODE
    cargo nextest run -v --locked ${CARGO_PROFILE:+--cargo-profile ${CARGO_PROFILE}} ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -E 'package(fedi-ffi)' -- "$@"
}
export -f run_tests

echo "## Running v2 bridge tests"
devimint dev-fed --exec bash -c run_tests
echo "## Tests Passed"
