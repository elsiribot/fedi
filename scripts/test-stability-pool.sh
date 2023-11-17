#!/usr/bin/env bash
# Verifies printing money via the dummy module

set -euo pipefail

export HOME="/tmp"
export RUST_LOG="${RUST_LOG:-info}"
export RUST_BACKTRACE=1
export INCLUDE_STABILITY_POOL=1
export USE_STABILITY_POOL_TEST_PARAMS=1
source ./scripts/build.sh ""

# needs the compiled binaries in the PATH
PATH="$(pwd)/target/${CARGO_PROFILE:-debug}/:$PATH"
which fedimintd

# symlink logs to local gitignored directory so they're easier to find
mkdir -p target
rm target/logs || true
ln -s "$FM_LOGS_DIR" target/logs || true
rm target/test || true
ln -s "$FM_TEST_DIR" target/test || true

cargo nextest run  ${CARGO_PROFILE:+--cargo-profile ${CARGO_PROFILE}} ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -E 'package(stability-pool-tests)'