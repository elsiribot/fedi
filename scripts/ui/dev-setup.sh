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

if [[ "$BUILD_BRIDGE" == "1" ]]; then
    echo "Building fedi bridge"
    if [[ "$BUILD_ANDROID" == "1" ]]; then
        $REPO_ROOT/scripts/bridge/build-bridge-android.sh
    fi
    if [[ "$BUILD_IOS" == "1" ]]; then
        $REPO_ROOT/scripts/bridge/build-bridge-ios.sh
    fi
fi

if [[ "$REINSTALL_PODS" == "1" ]]; then
    $REPO_ROOT/scripts/ui/install-ios-deps.sh
fi

echo "Finished dev-ui setup"
