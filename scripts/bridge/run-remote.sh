#!/usr/bin/env bash

# exit on failure
set -e

export FEDI_BRIDGE_REMOTE=1
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"
export CARGO_BUILD_TARGET_DIR="${TARGET_DIR}/native"

adb reverse tcp:8080 tcp:8080
cargo run --bin rpc-server
