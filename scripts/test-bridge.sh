#!/usr/bin/env bash
set -ex

export RUST_BACKTRACE=full
export TESTCASE=$1

# kill everything on exit
function kill_devimint() {
    kill $DEVIMINT_PID || true
}
trap kill_devimint EXIT

# compile binaries in a way that nix can cache
cargo build ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}}
cargo build ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p ln-gateway
cargo build ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p gateway-cli
cargo build ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p devimint

# fedi packages
source scripts/build.sh
export PATH="$PWD/target/${CARGO_PROFILE:-debug}:$PATH"
echo "Running in temporary directory $FM_TEST_DIR"

# symlink logs to local gitignored directory so they're easier to find
pwd
rm target/logs || true
echo $FM_LOGS_DIR
ln -s $FM_LOGS_DIR target/logs
rm target/test || true
ln -s $FM_LOGS_DIR target/test

devimint dev-fed &
DEVIMINT_PID=$!
eval "$(devimint env)"
devimint wait

FM_CONNECT_STRING=$(cat $FM_DATA_DIR/client-connect)
export FM_CONNECT_STRING

echo Funding fedimint-cli wallet ...
scripts/pegin.sh 40000.0
echo Funding CLN gateway e-cash wallet ...
scripts/pegin.sh 20000.0 1
echo Funding LND gateway e-cash wallet ...
scripts/pegin.sh 20000.0 1 "LND"

echo Funding ClientNG
ECASH=$($FM_MINT_CLIENT spend 20000000 | jq -e -r '.note')
fedimint-cli ng reissue $ECASH

echo "## Running tests"
cargo test ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi $TESTCASE -- --test-threads=1

echo "## Tests Passed"
