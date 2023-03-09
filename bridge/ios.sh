#!/usr/bin/env bash

# exit on failure
set -e 

rustup install nightly-x86_64-apple-darwin
rustup install nightly-aarch64-apple-darwin
rustup component add rust-src --toolchain nightly-x86_64-apple-darwin
rustup component add rust-src --toolchain nightly-aarch64-apple-darwin
rustup target add aarch64-apple-ios x86_64-apple-ios
rustup target add aarch64-apple-ios-sim --toolchain nightly
rustup target add aarch64-apple-darwin x86_64-apple-darwin

cd fedi-ffi
cargo run --package ffi-bindgen -- --language swift --out-dir ../fedi-swift/Sources/Fedi
cd ..

# ignoring MacOS for now
# cargo build --package fedi-ffi --profile release-smaller --target x86_64-apple-darwin
# cargo build --package fedi-ffi --profile release-smaller --target aarch64-apple-darwin
cargo build --package fedi-ffi --profile release-smaller --target x86_64-apple-ios $CARGO_FLAGS
cargo build --package fedi-ffi --profile release-smaller --target aarch64-apple-ios $CARGO_FLAGS
cargo +nightly build --package fedi-ffi --release -Z build-std --target aarch64-apple-ios-sim $CARGO_FLAGS

mkdir -p target/lipo-ios-sim/release-smaller
lipo target/aarch64-apple-ios-sim/release/libfediffi.a target/x86_64-apple-ios/release-smaller/libfediffi.a -create -output target/lipo-ios-sim/release-smaller/libfediffi.a
# mkdir -p target/lipo-macos/release-smaller
# lipo target/aarch64-apple-darwin/release-smaller/libfediffi.a target/x86_64-apple-darwin/release-smaller/libfediffi.a -create -output target/lipo-macos/release-smaller/libfediffi.a

pushd fedi-swift
mv Sources/Fedi/fedi.swift Sources/Fedi/Fedi.swift
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/Headers
cp Sources/Fedi/fediFFI.h fediFFI.xcframework/macos-arm64_x86_64/fediFFI.framework/Headers
cp ../target/aarch64-apple-ios/release-smaller/libfediffi.a fediFFI.xcframework/ios-arm64/fediFFI.framework/fediFFI
cp ../target/lipo-ios-sim/release-smaller/libfediffi.a fediFFI.xcframework/ios-arm64_x86_64-simulator/fediFFI.framework/fediFFI
# cp ../target/lipo-macos/release-smaller/libfediffi.a fediFFI.xcframework/macos-arm64_x86_64/fediFFI.framework/fediFFI
rm Sources/Fedi/fediFFI.h
rm Sources/Fedi/fediFFI.modulemap
#rm fediFFI.xcframework.zip || true
#zip -9 -r fediFFI.xcframework.zip fediFFI.xcframework
