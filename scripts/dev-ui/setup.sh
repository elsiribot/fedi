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
    $REPO_ROOT/scripts/bridge/build-bridge-android.sh
    $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
fi

if [[ "$SKIP_INSTALL_PODS" == "0" ]]; then
    echo "Installing ios Pods"
    cd $REPO_ROOT/ui/native/ios
    nix develop .#cross --command pod install
fi

echo "Finished dev-ui setup"
