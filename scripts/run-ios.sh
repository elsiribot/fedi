# exit on failure
set -e

# re-build bridge bindings for ios
pushd ../bridge
./ios.sh
popd

# make sure we've installed pods
pushd ios
pod install
popd

# launch ios
arch -x86_64 npx react-native run-ios
