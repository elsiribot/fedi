#!/usr/bin/env bash

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/ui/common

nix develop .#cross --command yarn dev