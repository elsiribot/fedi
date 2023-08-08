#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

TARGET=$REPO_ROOT/target

cd $BRIDGE_ROOT/fedi-ffi
nix develop .#cross --command cargo run --package ffi-bindgen -- --language swift --out-dir $BRIDGE_ROOT/fedi-swift/Sources/Fedi
cd $BRIDGE_ROOT

nix develop .#cross --command cargo build --package fedi-ffi --profile release-smaller --target x86_64-apple-ios $CARGO_FLAGS
nix develop .#cross --command cargo build --package fedi-ffi --profile release-smaller --target aarch64-apple-ios $CARGO_FLAGS
nix develop .#cross --command cargo build --package fedi-ffi --release --target aarch64-apple-ios-sim $CARGO_FLAGS

mkdir -p $TARGET/lipo-ios-sim/release-smaller
nix develop .#cross --command lipo $TARGET/aarch64-apple-ios-sim/release/libfediffi.a ../target/x86_64-apple-ios/release-smaller/libfediffi.a -create -output $TARGET/lipo-ios-sim/release-smaller/libfediffi.a

cd $BRIDGE_ROOT/fedi-swift
mv Sources/Fedi/fedi.swift Sources/Fedi/Fedi.swift || true
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/macos-arm64_x86_64/fediFFI.framework/Headers
cp $TARGET/aarch64-apple-ios/release-smaller/libfediffi.a fediFFI.xcframework/ios-arm64/fediFFI.framework/fediFFI
cp $TARGET/lipo-ios-sim/release-smaller/libfediffi.a fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
rm Sources/Fedi/fediFFI.h
rm Sources/Fedi/fediFFI.modulemap
#rm fediFFI.xcframework.zip || true
#zip -9 -r fediFFI.xcframework.zip fediFFI.xcframework
