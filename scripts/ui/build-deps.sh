#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

cd $REPO_ROOT/ui
echo "Reinstalling node modules from lockfile (yarn.lock)"
rm -rf $REPO_ROOT/ui/node_modules
yarn install --frozen-lockfile
echo "Finished installing node modules"

echo "Building UI modules: @fedi/common and @fedi/injections"
yarn build
echo "Building UI modules: @fedi/common and @fedi/injections"
cd $REPO_ROOT
