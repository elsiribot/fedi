#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

FLAVOR=${FLAVOR:-production}

# Check if git user + email to make sure we can commit when running in CI 
if [ -z "$(git config --global --get user.email)" ]; then
  git config --global user.email "dev@fedibtc.com"
  git config --global user.name "Fedi Dev CI"
fi

pushd $REPO_ROOT/ui/native

# Allow version bump if:
# - script is running locally
# - script is running on a release branch in CI
echo "Checking GITHUB_REF: $GITHUB_REF"
if [[ -z $GITHUB_REF || $GITHUB_REF == refs/heads/release/* ]]; then
  # Compare release branch with current version to determine
  # major vs minor vs patch version bump
  RELEASE_BRANCH_VERSION="${GITHUB_REF##*/}"
  echo "Release branch: $RELEASE_BRANCH_VERSION"
  CURRENT_VERSION="$(npm pkg get version --ws false | sed 's/"//g')"
  echo "Current version: $CURRENT_VERSION"
  CURRENT_MINOR_VERSION="$(cut -d '.' -f 1,2 <<< "$CURRENT_VERSION")"
  if [[ "$CURRENT_MINOR_VERSION" != "$RELEASE_BRANCH_VERSION" ]] && [[ "$RELEASE_BRANCH_VERSION" == *"."* ]];
  then
      echo 'Bumping npm minor version to $RELEASE_BRANCH_VERSION.0'
      npm version --allow-same-version --force $RELEASE_BRANCH_VERSION.0
  else
      echo 'Bumping npm patch version'
      npm version --allow-same-version --force patch
  fi

  # app stores expect these version codes to increment so update
  # react native version numbers to match npm
  echo "Bumping react-native version numbers to match npm"
  npx react-native-version --target android
  echo "Pushing version commit to git branch"
  NEW_VERSION="$(npm pkg get version  --ws false | sed 's/"//g')"
  echo "NEW_VERSION $NEW_VERSION"
  git add package.json android/app/build.gradle && git commit -m "chore: bump version for ${NEW_VERSION}" && git push
else
  echo "Not on a release branch. Don't push version commit."
fi

# Skip this step if running locally... Otherwise
# CI requires these values as outputs for later steps
if [[ -z $GITHUB_OUTPUT ]]; then
  echo "Not running in CI. Skip saving outputs for Github Actions."
else
  echo "Saving APK path + version + latest commit as outputs for next steps in job"
  COMMIT_TO_DEPLOY="$(git rev-parse HEAD)"
  echo "COMMIT_TO_DEPLOY=$(git rev-parse HEAD)" >> $GITHUB_OUTPUT
  APK_VERSION="$(npm pkg get version  --ws false | sed 's/"//g')"
  echo "APK_PATH=$REPO_ROOT/ui/native/android/app/build/outputs/apk/$FLAVOR/release/app-$FLAVOR-release-${APK_VERSION}-${COMMIT_TO_DEPLOY}.apk" >> $GITHUB_OUTPUT
  echo "APK_VERSION=$(npm pkg get version --ws false | sed 's/"//g')" >> $GITHUB_OUTPUT
fi

popd
