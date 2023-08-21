#!/usr/bin/env bash

cd bridge/fedi-wasm || exit
nix develop --ignore-environment .#cross --command ./wasm-build.sh "$@"
cd ../..
# cp out/* ../../ui/common/wasm# 

WASM_OUT="bridge/fedi-wasm/out"

# fedi-wasm-ui
mkdir -p fedi-wasm-ui/public
mkdir -p fedi-wasm-ui/src/wasm
cp "$WASM_OUT/fedi_wasm_bg.wasm" fedi-wasm-ui/public/fedi.wasm
cp $WASM_OUT/*.{ts,js} fedi-wasm-ui/src/wasm

# ui/common
cp $WASM_OUT/*.{ts,js,wasm} ui/common/wasm
