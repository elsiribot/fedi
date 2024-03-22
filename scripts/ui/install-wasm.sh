#!/usr/bin/env bash

set -e
$REPO_ROOT/scripts/enforce-nix.sh

# this script builds wasm for UI development using cached nix artifacts
WASM_BUILD_PROFILE=${WASM_BUILD_PROFILE:-dev}

echo "Installing wasm UI dependencies..."

nix build -L ".#wasm32-unknown.${WASM_BUILD_PROFILE}.fedi-wasm-pack"
cp "$REPO_ROOT/result/ui/common/wasm/"* "$REPO_ROOT/ui/common/wasm/"

echo "Installed wasm UI dependencies in $REPO_ROOT/ui/common/wasm/"
