#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/android

echo "Building Android release AAB with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
fastlane internal
echo "Deployment complete!"

popd
