# exit on failure
set -e

cd android
bundle exec fastlane build_production_apk
echo 'APK can be found at /fedi-react-native/android/app/build/outputs/apk/production/release/app-production-release.apk'
cd ..