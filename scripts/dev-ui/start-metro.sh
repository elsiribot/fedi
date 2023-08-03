#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "dev-ui: starting react-native metro bundler"

cd $REPO_ROOT/ui/native
nix develop .#cross --command yarn start
