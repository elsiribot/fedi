#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

if [ -n "${INSTALL_WASM_FROM_NIX:-}" ]; then
  >&2 echo "Installing wasm pack files built by Nix (${INSTALL_WASM_FROM_NIX} build profile)"
  nix build -L ".#wasm32-unknown.${INSTALL_WASM_FROM_NIX}.fedi-wasm-pack"
  cp -f result/ui/common/wasm/* "$REPO_ROOT/ui/common/wasm/"
  cp -f result/public/* "$REPO_ROOT/ui/common/wasm/"
  cp -f result/src/wasm/* "$REPO_ROOT/ui/common/wasm/"
fi

pushd $REPO_ROOT/ui

# Install dependencies
yarn install

# Check for Prettier, ESLint, + Typescript errors
yarn lint

# Run tests with Jest
yarn test

popd
