#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

# $REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

# Check if fastlane is installed
if ! command -v fastlane &> /dev/null; then
  echo "fastlane not found! Installing..."
  # Installation steps for fastlane, assuming no dependencies
  # You can replace this with the specific steps needed for your system
  # For example, using RubyGems to install fastlane:
  gem install fastlane -NV
fi

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."
fastlane beta_ci
echo "Build complete!"

popd
