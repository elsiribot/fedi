#!/bin/bash -x

WASM_OUT="$1"

cp "$WASM_OUT/fedi_wasm_bg.wasm" public/fedi.wasm
mkdir -p src/wasm
cp $WASM_OUT/*.{ts,js} src/wasm
