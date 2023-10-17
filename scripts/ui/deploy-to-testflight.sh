#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

SKIP_BRIDGE_REBUILD=${SKIP_BRIDGE_REBUILD:-0}
SKIP_POD_INSTALL=${SKIP_POD_INSTALL:-0}

if [[ "$SKIP_POD_INSTALL" == "1" ]]; then
  echo "Skipping pod install..."
else
  echo "Installing iOS dependencies (cocoapods)"
  $REPO_ROOT/scripts/ui/install-ios-deps.sh
fi

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
  echo "Skipping bridge build..."
else
  echo "Rebuilding iOS bridge with release profile"
  CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
fi

# First, delete DerivedData to remove outdated build artifacts
echo "Deleting DerivedData for a clean build directory..."
if [[ -n "$CI" ]]; then
  rm -Rf /Users/runner/Library/Developer/Xcode/DerivedData
else
  rm -Rf ~/Library/Developer/Xcode/DerivedData
fi

pushd $REPO_ROOT/ui/native/ios

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."

nix develop .#xcode --command fastlane beta_ci --verbose

echo "Build complete!"

popd
