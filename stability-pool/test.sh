#!/usr/bin/env bash
# Verifies printing money via the dummy module

set -euo pipefail
export RUST_LOG="${RUST_LOG:-info}"
export INCLUDE_STABILITY_POOL=1
source ../scripts/build.sh

cargo test -p stability-pool-tests
