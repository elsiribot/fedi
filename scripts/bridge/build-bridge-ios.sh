#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
BRIDGE_ROOT=$REPO_ROOT/bridge
TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"

# build Swift bindings
cd $BRIDGE_ROOT/fedi-ffi
# note: using '--target-dir' or otherwise this build will completely invalidate previous ones already in the ./target
cargo run --target-dir "${TARGET_DIR}/ffi-bindgen-run" --package ffi-bindgen -- --language swift --out-dir $BRIDGE_ROOT/fedi-swift/Sources/Fedi

cd $BRIDGE_ROOT

TARGETS=("aarch64-apple-ios-sim" "aarch64-apple-ios" "x86_64-apple-ios")
if [ "${CARGO_PROFILE:-}" == "ci" ]; then
  TARGETS=("aarch64-apple-ios-sim")
  >&2 echo "Skipping x86_64-apple-ios and aarch64-apple-ios builds"
fi
echo "Building iOS bridge for targets: ${TARGETS[*]}"

# clean any old binaries
# shellcheck disable=SC2046
rm -f $(find $TARGET_DIR/ -name libfediffi.a | grep -v '/deps/')

# build binaries for each supported target
for target in "${TARGETS[@]}"; do
  cargo build --target-dir "${TARGET_DIR}" --package fedi-ffi ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} --target $target $CARGO_FLAGS
done

# make sure build artifacts are available to the fedi-swift Xcode package
cd $BRIDGE_ROOT/fedi-swift
mv Sources/Fedi/fedi.swift Sources/Fedi/Fedi.swift || true

# we need to copy some files required by the Xcode framework
# there are 2 available libraries defined in fediFFI.xcframework/Info.plist
# - ios-arm64_x86_64-simulator
# - ios-arm64

# copy header files to their respective framework directories
echo "Copying header files..."
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/Headers

# copy binary files to their respective framework directories
echo "Copying binary files..."
# for development, we combine both x86 and aarch64 binaries into one
# x86_64-apple-ios-sim is not supported as a rustc target so we just use x86_64-apple-ios
AARCH64_SIM_BINARY_PATH=$TARGET_DIR/aarch64-apple-ios-sim/${CARGO_PROFILE:-debug}/libfediffi.a
X86_BINARY_PATH=$TARGET_DIR/x86_64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a
if [ -e "$AARCH64_SIM_BINARY_PATH" ] && [ -e "$X86_BINARY_PATH" ]; then
  echo "Combining binaries for development..."
  lipo $AARCH64_SIM_BINARY_PATH $X86_BINARY_PATH \
    -create -output $TARGET_DIR/lipo-ios-arm64_x86_64-simulator/${CARGO_PROFILE:-debug}/libfediffi.a

  cp \
    $TARGET_DIR/lipo-ios-arm64_x86_64-simulator/${CARGO_PROFILE:-debug}/libfediffi.a \
    fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
else
  # otherwise just use the aarch64 simulator binary
  cp $AARCH64_SIM_BINARY_PATH fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
fi

# 2. ios-arm64
# copy the aarch64 binary if it was built
AARCH64_BINARY_PATH=$TARGET_DIR/aarch64-apple-ios/${CARGO_PROFILE:-debug}/libfediffi.a
if [ -e "$AARCH64_BINARY_PATH" ]; then
  cp $AARCH64_BINARY_PATH fediFFI.xcframework/ios-arm64/fediFFI.framework/fediFFI
else
  echo "aarch64-apple-ios binary was not built..."
fi

# clean up unneeded files
rm Sources/Fedi/fediFFI.h
rm Sources/Fedi/fediFFI.modulemap

echo -e "\x1B[32;1miOS bridge build complete.\x1B[0m"
