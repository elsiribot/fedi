#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for android
npm run build-bridge-android

# launch android production flavor in debug mode
npx react-native run-android --variant=ProductionDebug --verbose
