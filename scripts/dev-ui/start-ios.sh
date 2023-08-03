#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

if [[ "$SKIP_IOS_BUILD" == "1" ]]; then
    echo "iOS build skipped"
    exit 0
fi

$REPO_ROOT/scripts/enforce-nix.sh

cd $REPO_ROOT/ui/native
echo "Building & installing ios app bundle"

# Launch ios. If FEDI_UDID env var is set, then run it on that device.
if [[ -z $FEDI_DEVICE_ID ]]
then
    nix develop .#cross --command npx react-native run-ios --destination arch=x86_64
else
    nix develop .#cross --command npx react-native run-ios --destination arch=x86_64 --udid $FEDI_DEVICE_ID
fi
