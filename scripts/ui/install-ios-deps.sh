#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Installing ios dependencies with Cocoapods"
pushd $REPO_ROOT/ui/native/ios
# xcode shell ensures we have cocoapods installed
# running `pod install --repo-update` twice because of https://github.com/fedibtc/fedi/issues/2459
nix develop .#xcode --command bash -c 'pod install --repo-update || pod install --repo-update'
popd

echo "Finished installing iOS dependencies"
