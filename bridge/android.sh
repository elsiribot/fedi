#!/usr/bin/env bash

# exit on failure
set -e

# make sure we've installed targets
rustup target add x86_64-linux-android
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi

# build maven package
cd fedi-android
./gradlew buildAndroidLib
./gradlew publishToMavenLocal
cd ..
