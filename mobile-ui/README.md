# Development Environment

To set up the development environment you will need to make sure you can build React Native applications.

Follow the guide here for your OS of choice: https://reactnative.dev/docs/environment-setup

You will also need to [install Rust](https://www.rust-lang.org/tools/install) because all the actual interaction with the Federation happens via [this rust code](https://github.com/fedibtc/bridge) which is built automatically by `npm run ios` / `npm run android`.

1. Start Metro

First, you will need to start Metro, the JavaScript bundler that ships with React Native.

`npx react-native start` inside the root of the React Native project folder (same level as `/android` and `/ios` folders)

2. Clone the bridge in same directory as you cloned this repo.

```
git clone git@github.com:fedibtc/bridge.git
```

The [Rust bridge](https://github.com/fedibtc/bridge) gets built automatically by our `npm run ios` / `npm run android` commands, but to simplify things just try building it independently. Android is trickier to build than iOS. If you have trouble on Android, message Justin.

```
# builds ios
./ios.sh

# builds android
./android.sh
```

3. Run the app

In one terminal run the Metro Bundler:

```
npm run start
```

In a separate terminal run the ios or android app

```
npm run ios

or

npm run android
```

You should see your new app running in the iOS Simulator or Android Studio emulator shortly.

## Directory Structure

-   `/screens`
    -   contains React components that are directly accessible by the navigator
    -   need to be properly typed and added to the `Router`
-   `/components` folder
    -   contains React components categorized by `/feature`
    -   consider creating a new folder if building something that does not fall into one of the existing `/feature` categories
    -   `/components/ui` is for more generalized components expected to be reused in many (3+) different components or screens

## Style Guide

TODO:...
