#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Building @fedi/common code (shared between PWA and native)"

cd $REPO_ROOT/ui/common
yarn dev
