#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

TARGET=$REPO_ROOT/target

cd $BRIDGE_ROOT/fedi-ffi
cargo run --package ffi-bindgen -- --language swift --out-dir $BRIDGE_ROOT/fedi-swift/Sources/Fedi
cd $BRIDGE_ROOT

# use the xcode shell to make sure we have the necessary SDKs
cargo build --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target x86_64-apple-ios $CARGO_FLAGS
cargo build --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target aarch64-apple-ios $CARGO_FLAGS
cargo build --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target aarch64-apple-ios-sim $CARGO_FLAGS

mkdir -p $TARGET/lipo-ios-sim/${CARGO_PROFILE:-debug}
lipo $TARGET/aarch64-apple-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a ../target/x86_64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a -create -output $TARGET/lipo-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a

cd $BRIDGE_ROOT/fedi-swift
mv Sources/Fedi/fedi.swift Sources/Fedi/Fedi.swift || true
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/macos-arm64_x86_64/fediFFI.framework/Headers
cp $TARGET/aarch64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a fediFFI.xcframework/ios-arm64/fediFFI.framework/fediFFI
cp $TARGET/lipo-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
rm Sources/Fedi/fediFFI.h
rm Sources/Fedi/fediFFI.modulemap
