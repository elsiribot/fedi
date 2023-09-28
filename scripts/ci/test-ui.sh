#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/ui

# Install dependencies
yarn install

# Check for Prettier, ESLint, + Typescript errors
yarn lint

# Run tests with Jest
yarn test

popd
