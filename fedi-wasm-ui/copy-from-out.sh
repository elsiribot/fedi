#!/bin/bash -x

WASM_OUT="../bridge/fedi-wasm/out"
mkdir -p public
mkdir -p src/wasm
cp "$WASM_OUT/fedi_wasm_bg.wasm" public/fedi.wasm
cp $WASM_OUT/*.{ts,js} src/wasm
