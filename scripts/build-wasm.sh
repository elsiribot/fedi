#!/usr/bin/env bash

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

pushd $REPO_ROOT/bridge/fedi-wasm || exit
wasm-pack build --target web --out-dir out "$@"
popd || exit

WASM_OUT="$REPO_ROOT/bridge/fedi-wasm/out"

# replace broken import
sed 's:import \*:// import \*:g' -i  $WASM_OUT/fedi_wasm.js
sed "s|imports\['env'\] \= \_\_wbg_star0;|imports['env'] = { GFp_poly1305_init: () => { throw Error('Ring library not available') }, GFp_poly1305_update: () => { throw Error('Ring library not available') }, GFp_poly1305_finish: () => { throw Error('Ring library not available') }, GFp_memcmp: () => { throw Error('Ring library not available') } };|g" -i  $WASM_OUT/fedi_wasm.js

# ui/common
cp $WASM_OUT/*.{ts,js,wasm} $REPO_ROOT/ui/common/wasm
