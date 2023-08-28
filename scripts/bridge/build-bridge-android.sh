#!/usr/bin/env bash

# exit on failure
set -e

if [ -z "${FEDI_CROSS_DEV_SHELL:-}" ] ; then
  >&2 echo "This command is meant to run in a .#cross shell"
  exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"
BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

# build the bridge inside nix
cargo build --target-dir "${TARGET_DIR}" ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi --target aarch64-linux-android

if [ "$FEDI_EMULATOR" != "1" ]; then
    cargo build --target-dir "${TARGET_DIR}" ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi --target x86_64-linux-android
    cargo build --target-dir "${TARGET_DIR}" ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi --target armv7-linux-androideabi
fi

# copy bridge outputs to where ffi-bindgen expects them
mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/arm64-v8a
cp ${TARGET_DIR}/aarch64-linux-android/${CARGO_PROFILE:-debug}/libfediffi.so fedi-android/lib/src/main/jniLibs/arm64-v8a/libfediffi.so

if [ "$FEDI_EMULATOR" != "1" ]; then
    mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/x86_64
    cp ${TARGET_DIR}/x86_64-linux-android/${CARGO_PROFILE:-debug}/libfediffi.so fedi-android/lib/src/main/jniLibs/x86_64/libfediffi.so
    mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/armeabi-v7a
    cp ${TARGET_DIR}/armv7-linux-androideabi/${CARGO_PROFILE:-debug}/libfediffi.so fedi-android/lib/src/main/jniLibs/armeabi-v7a/libfediffi.so
fi

# build android lib with ffi-bindgen inside nix
cd $BRIDGE_ROOT/fedi-ffi
# note: using '--target-dir' or otherwise this build will completely invalidate previous ones already in the ./target
cargo run --target-dir "${TARGET_DIR}/ffi-bindgen-run" --package ffi-bindgen -- --language kotlin --out-dir $BRIDGE_ROOT/fedi-android/lib/src/main/kotlin

# publish android live to local maven
cd $BRIDGE_ROOT/fedi-android
./gradlew publishToMavenLocal
