# re-build bridge bindings for ios
pushd ../bridge
./ios.sh
popd

# make sure we've installed pods
pushd ios
pod install
popd

# launch ios
npx react-native run-ios --udid 00008101-000535022693001E
