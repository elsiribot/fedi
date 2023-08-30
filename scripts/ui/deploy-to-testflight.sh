#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

# $REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
fastlane beta_ci
echo "Build complete!"

popd
