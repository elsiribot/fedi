#!/usr/bin/env bash

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
$REPO_ROOT/scripts/enforce-nix.sh

export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools

DEVICE_ID=$1
BUNDLE_PATH=$2
TEST_DESCRIPTION=$3

echo "Running tests on $TEST_DESCRIPTION (Device ID: $DEVICE_ID)"
pushd $REPO_ROOT/ui
if adb -s $DEVICE_ID shell pm list packages | grep -q "package:com.fedi"; then
  adb -s $DEVICE_ID uninstall com.fedi
else
  echo "No com.fedi detected. Continuing..."
fi
PLATFORM=android DEVICE_ID=$DEVICE_ID BUNDLE_PATH=$BUNDLE_PATH ts-node $REPO_ROOT/ui/native/tests/appium/runner.ts all
status=$?
echo "status=$status" >> $GITHUB_OUTPUT
popd
