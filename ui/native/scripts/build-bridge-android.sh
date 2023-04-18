#!/usr/bin/env bash

# exit on failure
set -e

# re-build bridge bindings for android
cd ../../bridge
if [[ -z $FEDI_NIX ]]
then
    ./android.sh
else
    ./nix-android.sh
fi
cd ../ui/native
