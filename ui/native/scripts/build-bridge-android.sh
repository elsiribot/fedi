#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for android
cd ../../bridge
if [ "$FEDI_NIX" == "1" ]; then
    ./nix-android.sh
else
    ./android.sh
fi

cd ../ui/native
