#!/usr/bin/env bash
set -euo pipefail

source scripts/common.sh

export PATH="${CARGO_BIN_DIR}:$PATH"
export PATH="${UPSTREAM_FEDIMINTD_NIX_PKGS}/bin:$PATH"

own_dir="$(dirname "${BASH_SOURCE[0]}")"
source "${own_dir}/test-bridge-current.inner.sh" "$@"
