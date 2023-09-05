#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui/native/ios

# Not sure if this step is necessary... Try uncommenting if CI starts failing
# for keychain related reasons
# security unlock-keychain -p $MATCH_KEYCHAIN_PASSWORD $MATCH_KEYCHAIN_NAME

echo "Building Xcode release archive with fastlane (see $REPO_ROOT/ui/native/ios/Fastfile for lane configurations)..."

if [[ "${IN_NIX_SHELL:-}" ]]; then
  echo "Use fastlane directly within Nix"
  fastlane beta_ci --verbose
else
  echo "Use bundle exec to run fastlane"
  gem install bundler:2.4.13
  bundle install
  bundle exec fastlane beta_ci --verbose
fi

echo "Build complete!"

popd
