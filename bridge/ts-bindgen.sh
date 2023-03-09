#!/usr/bin/env bash


rm fedi-ffi/target/bindings/*.ts
cargo test -- export_bindings
# concat all .ts files, remove imports, remove comments, add manual.ts.inc at top
cat fedi-ffi/target/bindings/*.ts | sed '/^import /d; s://.*$::' | cat ts/manual.ts.inc - > ts/bindings.ts
prettier --write ts/bindings.ts
