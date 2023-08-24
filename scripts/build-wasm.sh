#!/usr/bin/env bash

cd bridge/fedi-wasm || exit
nix develop --ignore-environment .#cross --command wasm-pack build --target web --out-dir out "$@"
cd ../..

WASM_OUT="bridge/fedi-wasm/out"

# replace broken import
sed 's:import \*:// import \*:g' -i  $WASM_OUT/fedi_wasm.js
sed "s|imports\['env'\] \= \_\_wbg_star0;|imports['env'] = { GFp_poly1305_init: () => { throw Error('Ring library not available') }, GFp_poly1305_update: () => { throw Error('Ring library not available') }, GFp_poly1305_finish: () => { throw Error('Ring library not available') }, GFp_memcmp: () => { throw Error('Ring library not available') } };|g" -i  $WASM_OUT/fedi_wasm.js

mkdir -p fedi-wasm-ui/public
mkdir -p fedi-wasm-ui/src/wasm
cp "$WASM_OUT/fedi_wasm_bg.wasm" fedi-wasm-ui/public/fedi.wasm
cp $WASM_OUT/*.{ts,js} fedi-wasm-ui/src/wasm

# ui/common
cp $WASM_OUT/*.{ts,js,wasm} ui/common/wasm
