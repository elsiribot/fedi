#!/usr/bin/env bash

set -e
REPO_ROOT=$(git rev-parse --show-toplevel)

if [[ "$SKIP_PWA_BUILD" == "1" ]]; then
    echo "PWA build skipped"
    exit 0
fi

$REPO_ROOT/scripts/enforce-nix.sh

echo "Building @fedi/common code (shared between PWA and native)"

cd $REPO_ROOT/ui/web
nix develop .#cross --command yarn dev
