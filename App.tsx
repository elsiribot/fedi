import notifee from '@notifee/react-native'
import { ThemeProvider } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import {
    init,
    LogEvent,
    TFedimintEventEmitter,
    TransactionEvent,
} from './bridge'
import CustomToast from './components/ui/CustomToast'
import Router from './Router'
import { BackupRecoveryProvider } from './state/contexts/BackupRecoveryContext'
import { EnvironmentProvider } from './state/contexts/EnvironmentContext'
import { FederationsProvider } from './state/contexts/FederationsContext'
import ProviderComposer from './state/contexts/ProviderComposer'
import theme from './styles/theme'

const App = () => {
    const [bridgeIsReady, setBridgeIsReady] = useState<boolean>(false)

    async function initializeBridge() {
        console.log('initializing connection to federation')
        const start = Date.now()
        await init(RNFS.DocumentDirectoryPath)
        setBridgeIsReady(true)
        const stop = Date.now()
        console.log('initialized:', stop - start, 'ms OS:', Platform.OS)
    }

    async function requestPushNotificationPermissions() {
        await notifee.requestPermission()
    }

    useEffect(() => {
        const emitter = new TFedimintEventEmitter()

        // Initialize logger
        const logHandler = (event: LogEvent) => {
            console.log('OS:', Platform.OS, `": log" -> "${event.log}"`)
        }
        emitter.onLog(logHandler)

        // Initialize push notification sender
        async function onDisplayNotification(event: TransactionEvent) {
            // Create a channel (required for Android)
            const channelId = await notifee.createChannel({
                id: 'transactions',
                name: 'Transactions Channel',
            })

            // Display a notification
            // TODO: if on-chain, replace existing notification if there is one
            await notifee.displayNotification({
                title: 'Transaction received',
                body: `Amount = ${event.transaction.amount}`,
                android: {
                    channelId,
                    // pressAction is needed if you want the notification to open the app when pressed
                    pressAction: {
                        id: 'transactions',
                    },
                },
            })
        }
        emitter.onTransaction(onDisplayNotification)

        initializeBridge()
        requestPushNotificationPermissions()
    }, [])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ProviderComposer
                    providers={[
                        EnvironmentProvider,
                        FederationsProvider,
                        BackupRecoveryProvider,
                    ]}>
                    {bridgeIsReady && <Router />}
                    <CustomToast />
                </ProviderComposer>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
