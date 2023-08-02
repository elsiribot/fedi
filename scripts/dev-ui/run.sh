#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)

set -euo pipefail

if [[ -z "${IN_NIX_SHELL:-}" ]]; then
  echo "It is recommended to run this command from a Nix dev shell. Use 'nix develop' first"
  sleep 3
fi

source $REPO_ROOT/scripts/dev-ui/setup.sh

mprocs -c $REPO_ROOT/misc/mprocs-dev-ui.yaml
