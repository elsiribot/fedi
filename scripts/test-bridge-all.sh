#!/usr/bin/env bash
set -e

./scripts/test-bridge-current.sh "$@"
nix develop .#v1 --command ./scripts/test-bridge-v1.sh "$@"
nix develop .#v0 --command ./scripts/test-bridge-v0.sh "$@"
