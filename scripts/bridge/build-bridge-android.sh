#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

$REPO_ROOT/scripts/enforce-nix.sh

BUILD_ALL_BRIDGE_TARGETS=${BUILD_ALL_BRIDGE_TARGETS:-0}

TARGET_DIR="${TARGET_DIR:-${REPO_ROOT}/target}"
BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

CARGO_PROFILE=${CARGO_PROFILE:-dev}
CARGO_PROFILE_DIR=${CARGO_PROFILE}
if [ "$CARGO_PROFILE" == "dev" ]; then
  CARGO_PROFILE_DIR="debug"
fi

# only build emulator target by default
TARGETS=("aarch64-linux-android")
JNILIBS_PATH="arm64-v8a"

if [ "$BUILD_ALL_BRIDGE_TARGETS" == "1" ]; then
  TARGETS=("aarch64-linux-android" "x86_64-linux-android" "armv7-linux-androideabi")
fi
echo "Building android bridge for targets: ${TARGETS[*]}"

# build binaries for each supported target
for target in "${TARGETS[@]}"; do
  echo "Building android bridge for $target"
  cargo build --target-dir "${TARGET_DIR}/pkg/fedi-ffi" ${CARGO_PROFILE:+--profile ${CARGO_PROFILE}} -p fedi-ffi --target $target

  if [ "${target:-}" == "aarch64-linux-android" ]; then
    JNILIBS_PATH=arm64-v8a
  fi
  if [ "${target:-}" == "x86_64-linux-android" ]; then
    JNILIBS_PATH=x86_64
  fi
  if [ "${target:-}" == "armv7-linux-androideabi" ]; then
    JNILIBS_PATH=armeabi-v7a
  fi
  
  mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/${JNILIBS_PATH}
  cp ${TARGET_DIR}/pkg/fedi-ffi/${target}/${CARGO_PROFILE_DIR}/libfediffi.so fedi-android/lib/src/main/jniLibs/${JNILIBS_PATH}/libfediffi.so
done

# build android lib with ffi-bindgen inside nix
cd $BRIDGE_ROOT/fedi-ffi
# note: using '--target-dir' or otherwise this build will completely invalidate previous ones already in the ./target
cargo run --target-dir "${TARGET_DIR}/pkg/fedi-ffi/ffi-bindgen-run" --package ffi-bindgen -- --language kotlin --out-dir $BRIDGE_ROOT/fedi-android/lib/src/main/kotlin

# publish android live to local maven
cd $BRIDGE_ROOT/fedi-android
./gradlew publishToMavenLocal
