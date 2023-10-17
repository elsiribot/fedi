#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Deleting DerivedData for a clean build directory..."
rm -Rf ~/Library/Developer/Xcode/DerivedData

$REPO_ROOT/scripts/ui/build-deps.sh
$REPO_ROOT/scripts/ui/install-ios-deps.sh
CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-ios.sh

pushd $REPO_ROOT/ui/native/ios

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
nix develop .#xcode --command fastlane build --verbose

echo "Build complete!"
popd
