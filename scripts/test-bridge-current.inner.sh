#!/usr/bin/env bash
set -euo pipefail

export INCLUDE_STABILITY_POOL=1
export USE_STABILITY_POOL_TEST_PARAMS=1
export RUST_BACKTRACE=full

# kill everything on exit
function kill_devimint() {
    kill $DEVIMINT_PID || true
}
trap kill_devimint EXIT

# fedi packages
source scripts/build.sh ""
echo "Running in temporary directory $FM_TEST_DIR"

# symlink logs to local gitignored directory so they're easier to find
mkdir -p target
rm target/logs || true
ln -s $FM_LOGS_DIR target/logs || true
rm target/test || true
ln -s $FM_TEST_DIR target/test || true

export FM_ADMIN_PASSWORD=p
devimint dev-fed &
DEVIMINT_PID=$!
eval "$(devimint env)"
devimint wait

# FM_INVITE_CODE=$(cat $FM_DATA_DIR/invite-code)
# export FM_INVITE_CODE

FM_INVITE_CODE=$(cat $FM_DATA_DIR/invite-code)
export FM_INVITE_CODE

echo "## Running v2 bridge tests"
cargo nextest run -v --locked ${CARGO_PROFILE:+--cargo-profile ${CARGO_PROFILE}} ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -E 'package(fedi-ffi)' -- "$@"
echo "## Tests Passed"
