fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android test

```sh
[bundle exec] fastlane android test
```

Runs all the tests

### android increment_version_code

```sh
[bundle exec] fastlane android increment_version_code
```

Increment the versionCode in build.gradle

### android build_debug

```sh
[bundle exec] fastlane android build_debug
```

Build a new apk to debug for production (apk can be found at /android/build/outputs/apk/production/debug/app-production-debug.apk)

### android build_production_apk

```sh
[bundle exec] fastlane android build_production_apk
```

Build a new app APK to release for production (apk can be found at /android/build/outputs/apk/productionRelease/app-production-debug.apk)

### android build_production

```sh
[bundle exec] fastlane android build_production
```

Build a new app bundle to release for production

### android upload_internal_build

```sh
[bundle exec] fastlane android upload_internal_build
```

Upload the latest build for internal testing

### android upload_beta_build_production

```sh
[bundle exec] fastlane android upload_beta_build_production
```

Upload the latest build for beta testing

### android internal

```sh
[bundle exec] fastlane android internal
```

Submit a new internal build

### android beta

```sh
[bundle exec] fastlane android beta
```

Submit a new beta build

### android build_bitcoin_lake_apk

```sh
[bundle exec] fastlane android build_bitcoin_lake_apk
```

Build a new APK to release (Bitcoin Lake)

### android build_bitcoin_lake

```sh
[bundle exec] fastlane android build_bitcoin_lake
```

Build a new app bundle to release (Bitcoin Lake)

### android upload_internal_build_bitcoin_lake

```sh
[bundle exec] fastlane android upload_internal_build_bitcoin_lake
```

Upload the latest build to internal track (Bitcoin Lake)

### android internal_bitcoin_lake

```sh
[bundle exec] fastlane android internal_bitcoin_lake
```

Submit a new internal build (Bitcoin Lake)

### android upload_beta_build_bitcoin_lake

```sh
[bundle exec] fastlane android upload_beta_build_bitcoin_lake
```

Upload the latest build (Bitcoin Lake)

### android beta_bitcoin_lake

```sh
[bundle exec] fastlane android beta_bitcoin_lake
```

Submit a new beta build (Bitcoin Lake)

### android build_bitcoin_jungle_apk

```sh
[bundle exec] fastlane android build_bitcoin_jungle_apk
```

Build a new APK to release (Bitcoin Jungle)

### android build_bitcoin_jungle

```sh
[bundle exec] fastlane android build_bitcoin_jungle
```

Build a new app bundle to release (Bitcoin Jungle)

### android upload_internal_build_bitcoin_jungle

```sh
[bundle exec] fastlane android upload_internal_build_bitcoin_jungle
```

Upload the latest build to internal track (Bitcoin Jungle)

### android internal_bitcoin_jungle

```sh
[bundle exec] fastlane android internal_bitcoin_jungle
```

Submit a new internal build (Bitcoin Jungle)

### android upload_beta_build_bitcoin_jungle

```sh
[bundle exec] fastlane android upload_beta_build_bitcoin_jungle
```

Upload the latest build to beta track (Bitcoin Jungle)

### android beta_bitcoin_jungle

```sh
[bundle exec] fastlane android beta_bitcoin_jungle
```

Submit a new beta build (Bitcoin Jungle)

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
