/**
 * @format
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppRegistry, AppState } from 'react-native'
import 'react-native-gesture-handler'
import 'react-native-reanimated'
import 'react-native-url-polyfill/auto'

import { configureLogging, saveLogsToStorage } from '@fedi/common/utils/log'

import App from './App'
import { name as appName } from './app.json'
import './localization/i18n'

// Register the app component
AppRegistry.registerComponent(appName, () => App)

// Configure logging to use AsyncStorage, and to save logs before close.
configureLogging(AsyncStorage)
AppState.addEventListener('change', state => {
    if (state === 'background' || state === 'inactive') {
        saveLogsToStorage()
    }
})
