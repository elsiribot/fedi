#!/usr/bin/env bash

# exit on failure
set -e

# build the bridge inside nix
nix develop --ignore-environment .#cross --command cargo build --release -p fedi-ffi --target aarch64-linux-android

if [ "$FEDI_EMULATOR" != "1" ]; then
    nix develop --ignore-environment .#cross --command cargo build --release -p fedi-ffi --target x86_64-linux-android
    nix develop --ignore-environment .#cross --command cargo build --release -p fedi-ffi --target armv7-linux-androideabi
fi

# copy bridge outputs to where ffi-bindgen expects them
mkdir -p fedi-android/lib/src/main/jniLibs/arm64-v8a
cp ../target/aarch64-linux-android/release/libfediffi.so fedi-android/lib/src/main/jniLibs/arm64-v8a/libfediffi.so

if [ "$FEDI_EMULATOR" != "1" ]; then
    mkdir -p fedi-android/lib/src/main/jniLibs/x86_64
    cp ../target/x86_64-linux-android/release/libfediffi.so fedi-android/lib/src/main/jniLibs/x86_64/libfediffi.so
    mkdir -p fedi-android/lib/src/main/jniLibs/armeabi-v7a
    cp ../target/armv7-linux-androideabi/release/libfediffi.so fedi-android/lib/src/main/jniLibs/armeabi-v7a/libfediffi.so
fi

# build android lib with ffi-bindgen inside nix
cd fedi-ffi
nix develop --ignore-environment .#cross --command cargo run --package ffi-bindgen -- --language kotlin --out-dir ../fedi-android/lib/src/main/kotlin
cd ..

# publish android live to local maven
cd fedi-android
./gradlew publishToMavenLocal
cd ..
