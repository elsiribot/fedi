#!/usr/bin/env bash

# exit on failure (strict)
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

SKIP_NODE_MODULES=${SKIP_NODE_MODULES:-0}
SKIP_BRIDGE_BUILD=${SKIP_BRIDGE_BUILD:-0}

if [[ "$MODE" == "interactive" ]]; then
  echo "Running development UI (native + PWA) in interactive mode"

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip reinstall node modules? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_NODE_MODULES=1
  else
    SKIP_NODE_MODULES=0
  fi

  unset REPLY
  while [[ -z "${REPLY:-}" ]] || ! [[ "${REPLY:-}" =~ ^[YyNn]$ ]]
  do
    read -p "Skip bridge rebuild? (y/n) " -n 1 -r
    echo
  done
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SKIP_BRIDGE_BUILD=1
  else
    SKIP_BRIDGE_BUILD=0
  fi
else
  echo "Running development UI (native + PWA)"
fi

source $REPO_ROOT/scripts/dev-ui/setup.sh

cd $REPO_ROOT
mprocs -c $REPO_ROOT/misc/mprocs-dev-ui.yaml
