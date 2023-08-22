#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/android
RELEASE_PATH=$REPO_ROOT/ui/native/android/app/build/outputs/apk/production/release
SOURCE=$RELEASE_PATH/app-production-release.apk
DESTINATION=./$APK_PATH
echo "Moving apk from $SOURCE to $DESTINATION"
mv $SOURCE $DESTINATION
popd