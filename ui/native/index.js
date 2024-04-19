/**
 * @format
 */
import notifee from '@notifee/react-native'
import messaging from '@react-native-firebase/messaging'
import { AppRegistry, AppState } from 'react-native'
import 'react-native-gesture-handler'
import 'react-native-reanimated'
import 'react-native-url-polyfill/auto'

import { configureLogging, saveLogsToStorage } from '@fedi/common/utils/log'

import App from './App'
import { name as appName } from './app.json'
import './localization/i18n'
import { storage } from './utils/storage'

messaging().setBackgroundMessageHandler(async remoteMessage => {
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
        id: 'chat-new-messages',
        name: 'Chat channel',
    })
    const title = `Chat`
    const body = remoteMessage.data.unread
        ? `You have ${remoteMessage.data.unread} new messages`
        : `You have new messages`

    await notifee.displayNotification({
        title,
        body,
        android: {
            channelId,
            pressAction: {
                id: 'chat-new-messages',
                roomId: remoteMessage.data.roomId || '',
            },
        },
    })
})
// Register the app component
AppRegistry.registerComponent(appName, () => App)

// Configure logging to use native storage, and to save logs before close.
configureLogging(storage)
AppState.addEventListener('change', state => {
    if (state === 'background' || state === 'inactive') {
        saveLogsToStorage()
    }
})
