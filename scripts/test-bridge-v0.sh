#!/usr/bin/env bash
set -ex

export RUST_BACKTRACE=full

# make sure nothing is running
pkill -9 fedimintd lnd lightningd gatewayd devimint esplora electrs bitcoind faucet distributedgen || true

if [[ "${TMP:-}" == *"/nix-shell."* ]]; then
  FM_TEST_DIR="${2-$TMP}/fm-$(LC_ALL=C tr -dc A-Za-z0-9 </dev/urandom | head -c 4 || true)"
else
  FM_TEST_DIR="${2-"$(mktemp --tmpdir -d XXXXX)"}"
fi
export FM_TEST_DIR
export FM_PID_FILE="$FM_TEST_DIR/.pid"
export FM_LOGS_DIR="$FM_TEST_DIR/logs"
export FM_POLL_INTERVAL=1
export FM_FED_SIZE=4

mkdir -p "$FM_TEST_DIR"
touch "$FM_PID_FILE"

# kill everything on exit
function kill_devimint() {
    kill $DEVIMINT_PID || true
}
trap kill_devimint EXIT

# fedi packages
echo "Running in temporary directory $FM_TEST_DIR"

# symlink logs to local gitignored directory so they're easier to find
rm target/logs || true
echo $FM_LOGS_DIR
ln -s $FM_LOGS_DIR target/logs || true
rm target/test || true
ln -s $FM_LOGS_DIR target/test || true

devimint dev-fed &
DEVIMINT_PID=$!
eval "$(devimint env)"
devimint wait

FM_INVITE_CODE=$(cat $FM_DATA_DIR/client-connect)
export FM_INVITE_CODE

echo Funding fedimint-cli wallet ...
scripts/pegin-v0.sh 40000.0
echo Funding CLN gateway e-cash wallet ...
scripts/pegin-v0.sh 20000.0 1
echo Funding LND gateway e-cash wallet ...
scripts/pegin-v0.sh 20000.0 1 "LND"

echo Funding ClientNG
ECASH=$($FM_MINT_CLIENT spend 20000000 | jq -e -r '.note')
fedimint-cli ng reissue $ECASH

echo "## Running tests"
# for now, just run all tests starting with `test_multi`
cargo test ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi "$@" -- --test-threads=1

echo "## Tests Passed"
