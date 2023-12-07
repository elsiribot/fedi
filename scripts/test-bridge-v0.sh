#!/usr/bin/env bash
set -ex

export RUST_BACKTRACE=full

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
mkdir -p target
echo "FM_LOGS_DIR: $FM_LOGS_DIR"
echo "FM_TEST_DIR: $FM_TEST_DIR"

mkdir -p "$FM_LOGS_DIR"
mkdir -p "$FM_TEST_DIR"

rm -f target/logs
ln -s $FM_LOGS_DIR target/logs || true
rm -f target/test
ln -s $FM_LOGS_DIR target/test || true

devimint dev-fed &
DEVIMINT_PID=$!
eval "$(devimint env)"

devimint wait

FM_INVITE_CODE=$(cat $FM_TEST_DIR/cfg/client-connect)
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

echo "## Running v0 bridge tests"
echo "fedimintd: $(fedimintd version-hash)"
cargo nextest run --locked  ${CARGO_PROFILE:+--cargo-profile ${CARGO_PROFILE}} ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -E 'package(fedi-ffi)' --test-threads=1 -- "$@"

echo "## Tests Passed"
