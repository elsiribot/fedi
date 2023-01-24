# exit on failure
set -e 

# make sure we've installed targets
rustup target add x86_64-linux-android
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi

# build maven package
pushd calculator-android
./gradlew buildAndroidLib
./gradlew publishToMavenLocal
popd
