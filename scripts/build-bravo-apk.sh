#!/usr/bin/env bash

# exit on failure (strict)
set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh
$REPO_ROOT/scripts/bridge/build-bridge-android.sh

cd $REPO_ROOT/ui/native/android
nix develop .#cross --command fastlane build_bravo_apk
echo "APK built successfully at $REPO_ROOT/ui/native/android/app/build/outputs/apk/bravo/release/app-bravo-release.apk"
