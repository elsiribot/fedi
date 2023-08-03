#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Building & installing android app bundle"

cd $REPO_ROOT/ui/native
nix develop .#cross --command npx react-native run-android --active-arch-only --mode=ProductionDebug --verbose
sleep 1
echo "Starting android logcat"
nix develop .#cross --command adb logcat *:S ReactNative:V ReactNativeJS:V
