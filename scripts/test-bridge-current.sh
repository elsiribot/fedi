#!/usr/bin/env bash
set -euo pipefail

export PATH="$PWD/target/${CARGO_PROFILE:-debug}:$PATH"

own_dir="$(dirname "${BASH_SOURCE[0]}")"
source "${own_dir}/test-bridge-current.inner.sh"
