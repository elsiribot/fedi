#!/usr/bin/env bash

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/ui/native

nix develop .#cross --command yarn dev:android
nix develop .#cross --command adb logcat *:S ReactNative:V ReactNativeJS:V
