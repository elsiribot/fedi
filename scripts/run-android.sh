# re-build bridge bindings for android
pushd ../bridge
./android.sh
popd

# launch android
npx react-native run-android
