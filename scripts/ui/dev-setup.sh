#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

echo "Starting dev-ui setup"

cd $REPO_ROOT/ui

# install node modules and build ui dependencies
echo "Installing node modules"
yarn install

echo "Building dependencies"
yarn build:deps

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
