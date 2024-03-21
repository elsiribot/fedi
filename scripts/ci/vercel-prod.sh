#!/usr/bin/env bash

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

if [ -n "${INSTALL_WASM_FROM_NIX:-}" ]; then
  >&2 echo "Installing wasm pack files built by Nix (${INSTALL_WASM_FROM_NIX} build profile)"
  nix build -L ".#wasm32-unknown.${INSTALL_WASM_FROM_NIX}.fedi-wasm-pack"
  cp -f result/ui/common/wasm/* "$REPO_ROOT/ui/common/wasm/"
  cp -f result/public/* "$REPO_ROOT/ui/common/wasm/"
  cp -f result/src/wasm/* "$REPO_ROOT/ui/common/wasm/"
fi

# Pull Vercel Environment Information
vercel pull --yes --environment=production --token=$VERCEL_TOKEN

# Build Project Artifacts
vercel build --prod --token=$VERCEL_TOKEN

# Deploy Project Artifacts to Vercel
url=$(vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN")
echo "url=$url" >> "$GITHUB_OUTPUT"
