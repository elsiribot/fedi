#!/usr/bin/env bash
set -e

nix develop .#v0 --command ./scripts/test-bridge-v0.sh "$@"
nix develop .#default --command ./scripts/test-bridge-v1.sh "$@"
