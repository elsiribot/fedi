#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/android

echo "Building nightly flavor release APK with fastlane (see $REPO_ROOT/ui/native/android/Fastfile for lane configurations)..."
fastlane build_nightly_apk
echo "APK built successfully at $REPO_ROOT/ui/native/android/app/build/outputs/apk/nightly/release/app-nightly-release.apk"

RELEASE_PATH=$REPO_ROOT/ui/native/android/app/build/outputs/apk/nightly/release
SOURCE=$RELEASE_PATH/app-nightly-release.apk
DESTINATION=$APK_PATH
echo "Moving apk from $SOURCE to $DESTINATION"
mv $SOURCE $DESTINATION

popd
