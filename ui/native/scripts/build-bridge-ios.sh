#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for android
pushd ../../bridge
./ios.sh
popd
