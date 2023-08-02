#!/usr/bin/env bash

# exit on failure
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
BRIDGE_ROOT=$REPO_ROOT/bridge
cd $BRIDGE_ROOT

# build the bridge inside nix
nix develop .#cross --command cargo build --release -p fedi-ffi --target aarch64-linux-android

if [ "$FEDI_EMULATOR" != "1" ]; then
    nix develop .#cross --command cargo build --release -p fedi-ffi --target x86_64-linux-android
    nix develop .#cross --command cargo build --release -p fedi-ffi --target armv7-linux-androideabi
fi

# copy bridge outputs to where ffi-bindgen expects them
mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/arm64-v8a
cp $REPO_ROOT/target/aarch64-linux-android/release/libfediffi.so fedi-android/lib/src/main/jniLibs/arm64-v8a/libfediffi.so

if [ "$FEDI_EMULATOR" != "1" ]; then
    mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/x86_64
    cp $REPO_ROOT/target/x86_64-linux-android/release/libfediffi.so fedi-android/lib/src/main/jniLibs/x86_64/libfediffi.so
    mkdir -p $BRIDGE_ROOT/fedi-android/lib/src/main/jniLibs/armeabi-v7a
    cp $REPO_ROOT/target/armv7-linux-androideabi/release/libfediffi.so fedi-android/lib/src/main/jniLibs/armeabi-v7a/libfediffi.so
fi
# build android lib with ffi-bindgen inside nix
cd $BRIDGE_ROOT/fedi-ffi
nix develop --ignore-environment .#cross --command cargo run --package ffi-bindgen -- --language kotlin --out-dir $BRIDGE_ROOT/fedi-android/lib/src/main/kotlin

# publish android live to local maven
cd $BRIDGE_ROOT/fedi-android
nix develop .#cross --command ./gradlew publishToMavenLocal
