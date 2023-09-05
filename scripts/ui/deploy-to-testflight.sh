#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

# Not sure if this step is necessary... Try uncommenting if CI starts failing
# for keychain related reasons
# security unlock-keychain -p $MATCH_KEYCHAIN_PASSWORD $MATCH_KEYCHAIN_NAME

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
fastlane beta_ci --verbose
echo "Build complete!"

popd
