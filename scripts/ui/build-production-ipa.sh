#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Deleting DerivedData for a clean build directory..."
rm -Rf ~/Library/Developer/Xcode/DerivedData

SKIP_BRIDGE_BUILD=${SKIP_BRIDGE_BUILD:-0}
SKIP_UI_DEPS_BUILD=${SKIP_UI_DEPS_BUILD:-0}
SKIP_POD_INSTALL=${SKIP_POD_INSTALL:-0}

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
  echo "Skipping bridge build..."
else
  echo "Rebuilding iOS bridge with release profile"
  CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
fi

if [[ "$SKIP_UI_DEPS_BUILD" == "1" ]]; then
  echo "Skipping UI dependencies build..."
else
  echo "Building UI dependencies..."
  $REPO_ROOT/scripts/ui/build-deps.sh
fi

if [[ "$SKIP_POD_INSTALL" == "1" ]]; then
  echo "Skipping pod install..."
else
  echo "Installing iOS dependencies (cocoapods)"
  $REPO_ROOT/scripts/ui/install-ios-deps.sh
fi

pushd $REPO_ROOT/ui/native/ios

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
nix develop .#xcode --command fastlane build --verbose

echo "Build complete!"
popd
