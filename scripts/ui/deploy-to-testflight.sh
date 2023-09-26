#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

SKIP_BRIDGE_REBUILD=${SKIP_BRIDGE_REBUILD:-0}

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
  echo "Skipping bridge build..."
else
  echo "Rebuilding iOS bridge with release profile"
  CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
fi

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."

nix develop .#xcode --command fastlane beta_ci --verbose

echo "Build complete!"

popd
