#!/usr/bin/env bash

set -e
$REPO_ROOT/scripts/enforce-nix.sh

echo "Installing wasm UI dependencies..."

echo "Installing wasm files built using wasm-pack"
"$REPO_ROOT/scripts/build-wasm.sh"
cp -f "$CARGO_BUILD_TARGET_DIR/pkgs/wasm-pack/wasm-pack-out/"* "$REPO_ROOT/ui/common/wasm/"

echo "Installed wasm UI dependencies in $REPO_ROOT/ui/common/wasm/"
