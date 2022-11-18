# Development Environment

To set up the development environment you will need to make sure you can build React Native applications.

Follow the guide here for your OS of choice: https://reactnative.dev/docs/environment-setup

If you have your Android/iOS dependencies installed and configured correctly, you should be able to follow these steps:

1. Start Metro

First, you will need to start Metro, the JavaScript bundler that ships with React Native.

`npx react-native start` inside the root of the React Native project folder (same level as `/android` and `/ios` folders)

2. Start your application

Let Metro Bundler run in its own terminal. Open a new terminal inside your React Native project folder and run one of the following:

```
npx react-native run-ios

or

npx react-native run-android
```

You should see your new app running in the iOS Simulator or Android Studio emulator shortly.
