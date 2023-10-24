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

# Build numbers are timestamp based to ensure they are always
# increasing. Must be lower than 2,100,000,000 so the scheme is:
# Get the last two digits of the year
YY=$(date +"%y")
# Get the day of the year, zero-padded
DDD=$(date +"%j")
# Get the current time in HHMM format
HHMM=$(date +"%H%M")
# Combine to form the build number
BUILD_NUMBER="${YY}${DDD}${HHMM}"

# if we are building a nightly APK from the master branch in CI...
# modify the build numbers so the app stores will accept
# the upload. We do not commit this since build numbers are timestamp based
if [[ -n $GITHUB_REF && $GITHUB_REF == refs/heads/master && -n $FLAVOR && $FLAVOR == "nightly" ]]; then
  npx react-native-version --increment-build --never-amend --set-build $BUILD_NUMBER
fi

echo "Building Android release AAB with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
if [ -z "${FLAVOR:-}" ]; then
    fastlane internal
else
    fastlane internal_$FLAVOR
fi
echo "Deployment complete!"

popd
