#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

rm -f $BRIDGE_ROOT/fedi-ffi/target/bindings/*.ts
cargo test -- export_bindings
# concat all .ts files, remove imports, remove comments, add manual.ts.inc at top
cat $BRIDGE_ROOT/fedi-ffi/target/bindings/*.ts | sed '/^import /d; s://.*$::' | cat $BRIDGE_ROOT/ts/manual.ts.inc - > $REPO_ROOT/ui/common/types/bindings.ts
prettier --write $REPO_ROOT/ui/common/types/bindings.ts
