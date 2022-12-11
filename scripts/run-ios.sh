# re-build bridge bindings for ios
pushd ../bridge
./local-ios.sh
popd

# launch ios
npx react-native run-ios
