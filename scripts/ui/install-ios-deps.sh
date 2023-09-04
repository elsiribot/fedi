#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Installing ios dependencies with Cocoapods"
pushd $REPO_ROOT/ui/native/ios
# xcode shell ensures we have cocoapods installed
nix develop .#xcode --command pod install
popd

echo "Finished installing iOS dependencies"
