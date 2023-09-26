#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

# TODO: uncomment when https://github.com/fedibtc/fedi/issues/1652 is resolved
# $REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

SKIP_BRIDGE_REBUILD=${SKIP_BRIDGE_REBUILD:-0}

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
  echo "Skipping bridge build..."
else
  echo "Rebuilding iOS bridge with release profile"
  CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
fi

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."

if [[ -n "${IN_NIX_SHELL:-}" ]]; then
  echo "Running fastlane beta_ci in Nix shell..."
  fastlane beta_ci --verbose
else
  # Check if fastlane is installed
  if command -v fastlane &> /dev/null; then
    fastlane beta --verbose
  else
    echo "fastlane not found! Install it first: https://docs.fastlane.tools/getting-started/ios/setup/"
  fi
fi

echo "Build complete!"

popd
