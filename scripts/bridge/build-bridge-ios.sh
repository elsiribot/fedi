#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
BRIDGE_ROOT=$REPO_ROOT/bridge
TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"

cd $BRIDGE_ROOT
# use the xcode shell to make sure we have the necessary SDKs
if [ "${CARGO_PROFILE:-}" == "ci" ]; then
  >&2 echo "Skipping x86_64-apple-ios and aarch64-apple-ios builds"
else
  cargo build --target-dir "${TARGET_DIR}" --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target x86_64-apple-ios $CARGO_FLAGS
  cargo build --target-dir "${TARGET_DIR}" --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target aarch64-apple-ios $CARGO_FLAGS
fi
cargo build --target-dir "${TARGET_DIR}" --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target aarch64-apple-ios-sim $CARGO_FLAGS

mkdir -p $TARGET_DIR/lipo-ios-sim/${CARGO_PROFILE:-debug}
# shellcheck disable=SC2046
lipo $(find $TARGET_DIR/ -name libfediffi.a | grep -v '/deps/') -create -output $TARGET_DIR/lipo-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a

cd $BRIDGE_ROOT/fedi-ffi
# note: using '--target-dir' or otherwise this build will completely invalidate previous ones already in the ./target
cargo run --target-dir "${TARGET_DIR}/ffi-bindgen-run" --package ffi-bindgen -- --language swift --out-dir $BRIDGE_ROOT/fedi-swift/Sources/Fedi

cd $BRIDGE_ROOT/fedi-swift
mv Sources/Fedi/fedi.swift Sources/Fedi/Fedi.swift || true
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/macos-arm64_x86_64/fediFFI.framework/Headers
if [ -e "${TARGET_DIR}/aarch64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a" ]; then
  cp $TARGET_DIR/aarch64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a fediFFI.xcframework/ios-arm64/fediFFI.framework/fediFFI
fi
cp $TARGET_DIR/lipo-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
rm Sources/Fedi/fediFFI.h
rm Sources/Fedi/fediFFI.modulemap
