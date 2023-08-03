#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

if [[ "$SKIP_ANDROID_BUILD" == "1" ]]; then
    echo "Android build skipped"
    exit 0
fi

$REPO_ROOT/scripts/enforce-nix.sh

cd $REPO_ROOT/ui/native
echo "Building & installing android app bundle"

nix develop .#cross --command npx react-native run-android --active-arch-only --mode=ProductionDebug --verbose
sleep 1
echo "Starting android logging..."
nix develop .#cross --command npx react-native log-android
