#!/usr/bin/env bash

./ts-bindgen.sh
./ios.sh
../scripts/bridge/build-bridge-android.sh
