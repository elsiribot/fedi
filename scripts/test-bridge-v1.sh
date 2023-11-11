#!/usr/bin/env bash
set -ex

export PATH="$PWD/target/${CARGO_PROFILE:-debug}:$PATH"
own_dir="$(dirname "${BASH_SOURCE[0]}")"

source "${own_dir}/test-bridge-v1.inner.sh"
