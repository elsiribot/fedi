# exit on failure
set -e

# re-build bridge bindings for android
./build-bridge-android.sh

# launch android
npx react-native run-android --variant=ProductionDebug
