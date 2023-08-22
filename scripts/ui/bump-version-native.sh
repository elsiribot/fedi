#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

cd $REPO_ROOT/ui
git config --global user.email "dev@fedibtc.com"
git config --global user.name "Fedi Dev CI"
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
echo "Bumping react-native version numbers to match npm"
npx react-native-version --target android
NEW_VERSION="$(npm pkg get version  --ws false | sed 's/"//g')"
echo "NEW_VERSION $NEW_VERSION"
echo "Pushing version commit to git branch"
# git add package.json android/app/build.gradle && git commit -m "${NEW_VERSION}" && git push
echo "Saving new version + APK path as outputs for next steps in job"
echo "NEW_VERSION=$(npm pkg get version --ws false | sed 's/"//g')" >> $GITHUB_OUTPUT
echo "APK_PATH=android/app/build/outputs/apk/production/release/app-production-release-${NEW_VERSION}.apk" >> $GITHUB_OUTPUT
echo "Saving latest commit to output for 'call-deployment-workflow' job"
echo "COMMIT_TO_DEPLOY=$(git rev-parse HEAD)" >> $GITHUB_OUTPUT