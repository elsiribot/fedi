/**
 * @format
 */
import messaging from '@react-native-firebase/messaging'
import { AppRegistry, AppState } from 'react-native'
import 'react-native-gesture-handler'
import 'react-native-reanimated'
import 'react-native-url-polyfill/auto'

import { configureLogging, saveLogsToStorage } from '@fedi/common/utils/log'

import App from './App'
import { name as appName } from './app.json'
import i18next from './localization/i18n'
import { handleBackgroundFCMReceived } from './utils/notifications'
import { storage } from './utils/storage'

// Dispatches FCM notifications when app is closed
messaging().setBackgroundMessageHandler(m =>
    handleBackgroundFCMReceived(m, i18next.t),
)

// Handles FCM notifications when app is open
messaging().onMessage(m => handleForegroundFCMReceived(m, i18next.t))

// Register the app component
AppRegistry.registerComponent(appName, () => App)

// Configure logging to use native storage, and to save logs before close.
configureLogging(storage)
AppState.addEventListener('change', state => {
    if (state === 'background' || state === 'inactive') {
        saveLogsToStorage()
    }
})
