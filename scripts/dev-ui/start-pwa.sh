#!/usr/bin/env bash

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd $REPO_ROOT/ui/web

nix develop .#cross --command yarn dev