#!/usr/bin/env bash

# Versioning
# To bump the version number in /ui/native/package.json
# we use `npm version` with either a minor or patch version bump
# Then we use react-native-version to bump the version code
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

# Build numbers are timestamp based to ensure they are always
# increasing. Must be lower than 2,100,000,000 so the scheme is:
PREFIX="1"
# Get the last two digits of the year
YY=$(date +"%y")
# Get the day of the year, zero-padded
DDD=$(date +"%j")
# Get the current time in HHMM format
HHMM=$(date +"%H%M")
# Combine to form the build number
BUILD_NUMBER="${PREFIX}${YY}${DDD}${HHMM}"

# if we are building a nightly APK from the master branch in CI...
# modify the build numbers so the app stores will accept
# the upload. We do not commit this since build numbers are timestamp based
if [[ -n $GITHUB_REF && $GITHUB_REF == refs/heads/master && -n $FLAVOR && $FLAVOR == "nightly" ]]; then
  npx react-native-version --increment-build --never-amend --set-build $BUILD_NUMBER
fi

# Here we bump the version and commit to the repo, but only allow if:
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
  echo "Bumping Android version numbers to match npm"
  npx react-native-version --set-build $BUILD_NUMBER --target android
  # iOS: Navigate to xcode project and update version using agvtool
  # using only the major.minor version to avoid excessive review times
  # on Testflight. For the build number use react-native-version
  echo "Bumping iOS version numbers to match npm"
  pushd $REPO_ROOT/ui/native/ios
  agvtool new-marketing-version $RELEASE_BRANCH_VERSION
  npx react-native-version --increment-build --never-amend --set-build $BUILD_NUMBER
  popd
  echo "Pushing version commit to git branch"
  NEW_VERSION="$(npm pkg get version  --ws false | sed 's/"//g')"
  echo "NEW_VERSION $NEW_VERSION"
  git add package.json android/app/build.gradle ios/ && git commit -m "chore: bump version for ${NEW_VERSION}" && git push
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
