#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/android
echo "Building release APK with fastlane (see $REPO_ROOT/ui/native/android/Fastfile for lane configurations)..."
fastlane build_production_apk
echo "Build complete!"
popd