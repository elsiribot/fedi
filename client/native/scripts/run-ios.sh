#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for ios
npm run build-bridge-ios

# make sure we've installed pods
pushd ios
pod install
popd

# launch ios
npx react-native run-ios
