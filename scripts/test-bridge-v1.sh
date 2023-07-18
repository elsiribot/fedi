#!/usr/bin/env bash
set -ex

pkill -9 fedimintd lnd lightningd gatewayd devimint esplora electrs bitcoind faucet || true

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
rm target/logs || true
ln -s $FM_LOGS_DIR target/logs || true
rm target/test || true
ln -s $FM_TEST_DIR target/test || true

export FM_ADMIN_PASSWORD=admin-pass
devimint dev-fed &
DEVIMINT_PID=$!
eval "$(devimint env)"
devimint wait

FM_INVITE_CODE=$(cat $FM_DATA_DIR/invite-code)
export FM_INVITE_CODE

echo "## Running tests"
# for now, just run all tests starting with `test_multi`
# cargo test ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi "$@" -- --test-threads=1
cargo test ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi test_multi -- --test-threads=1

echo "## Tests Passed"
