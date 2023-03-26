#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for android
cd ../bridge
./android.sh
cd ../mobile-ui
