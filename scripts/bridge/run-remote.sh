#!/usr/bin/env bash

# exit on failure
set -e

if [ -z "$FEDI_BRIDGE_REMOTE" ]
then
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"
export CARGO_BUILD_TARGET_DIR="${TARGET_DIR}/native"

adb reverse tcp:13127 tcp:13127
cargo run --bin rpc-server
