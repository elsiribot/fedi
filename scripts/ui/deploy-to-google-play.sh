#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

SKIP_BRIDGE_BUILD=${SKIP_BRIDGE_BUILD:-0}
SKIP_UI_DEPS_BUILD=${SKIP_UI_DEPS_BUILD:-0}

if [[ "$SKIP_BRIDGE_BUILD" == "1" ]]; then
  echo "Skipping bridge build..."
else
  echo "Rebuilding Android bridge with release profile"
  CARGO_PROFILE=release $REPO_ROOT/scripts/bridge/build-bridge-android.sh
fi

if [[ "$SKIP_UI_DEPS_BUILD" == "1" ]]; then
  echo "Skipping UI dependencies build..."
else
  echo "Building UI dependencies..."
  $REPO_ROOT/scripts/ui/build-deps.sh
fi

pushd $REPO_ROOT/ui/native/android

echo "Building Android release AAB with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
if [ -z "${FLAVOR:-}" ]; then
    fastlane internal
else
    fastlane internal_$FLAVOR
fi
echo "Deployment complete!"

popd
