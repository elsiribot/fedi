#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for ios
npm run build-bridge-ios

# make sure we've installed pods
pushd ios
pod install
popd

# Launch ios. If FEDI_UDID env var is set, then run it on that device.
if [[ -z $FEDI_DEVICE_ID ]]
then
    npx react-native run-ios
else
    npx react-native run-ios --udid $FEDI_DEVICE_ID
fi
