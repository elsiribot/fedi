#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Starting dev-ui setup"

cd $REPO_ROOT/ui

if [[ "$SKIP_NODE_MODULES" == "0" ]]; then
    echo "Reinstalling node modules"
    rm -rf $REPO_ROOT/ui/node_modules
    nix develop .#cross --command yarn install
fi

if [[ "$SKIP_BRIDGE_BUILD" == "0" ]]; then
    echo "Building fedi bridge"
    if [[ "$SKIP_ANDROID_BUILD" == "0" ]]; then
        $REPO_ROOT/scripts/bridge/build-bridge-android.sh
    fi
    if [[ "$SKIP_IOS_BUILD" == "0" ]]; then
        $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
    fi
fi

if [[ "$SKIP_INSTALL_PODS" == "0" ]]; then
    $REPO_ROOT/scripts/ui/install-ios-deps.sh
fi

echo "Finished dev-ui setup"
