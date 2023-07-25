import notifee from '@notifee/react-native'
import messaging from '@react-native-firebase/messaging'
import { ThemeProvider } from '@rneui/themed'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as ReduxProvider } from 'react-redux'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import Router from './Router'
import { fedimint, initializeBridge } from './bridge'
import CustomToast from './components/ui/CustomToast'
import { ErrorScreen } from './screens/ErrorScreen'
import { BackupRecoveryProvider } from './state/contexts/BackupRecoveryContext'
import { EnvironmentProvider } from './state/contexts/EnvironmentContext'
import { FederationsProvider } from './state/contexts/FederationsContext'
import ProviderComposer from './state/contexts/ProviderComposer'
import { initializeNativeStore, store } from './state/store'
import theme from './styles/theme'

const App = () => {
    const { t } = useTranslation()
    const [bridgeIsReady, setBridgeIsReady] = useState<boolean>(false)

    async function onInitializeBridge() {
        console.info(
            'initializing connection to federation',
            RNFS.DocumentDirectoryPath,
        )
        const start = Date.now()
        await initializeBridge(RNFS.DocumentDirectoryPath)
        setBridgeIsReady(true)
        const stop = Date.now()
        console.info('initialized:', stop - start, 'ms OS:', Platform.OS)
    }

    async function requestPushNotificationPermissions() {
        await notifee.requestPermission()
    }

    // Initialize redux store
    useEffect(() => initializeNativeStore(), [])

    useEffect(() => {
        onInitializeBridge()
    }, [])

    useEffect(() => {
        // Initialize logger
        const unsubscribeLog = fedimint.addListener('log', event => {
            // Strip escape characters
            const stripped = event.log.replace('\\', '')
            console.info('OS:', Platform.OS, `": log" -> "${stripped}"`)
        })

        // Initialize push notification sender
        const unsubscribeTransaction = fedimint.addListener(
            'transaction',
            async event => {
                // Create a channel (required for Android)
                const channelId = await notifee.createChannel({
                    id: 'transactions',
                    name: 'Transactions Channel',
                })

                // Display notifications only for incoming transactions
                if (
                    event.transaction.direction === TransactionDirection.receive
                ) {
                    await notifee.displayNotification({
                        title: t('phrases.transaction-received'),
                        body: `${amountUtils.formatNumber(
                            amountUtils.msatToSat(event.transaction.amount),
                        )} ${t('words.sats')}`,
                        android: {
                            channelId,
                            // pressAction is needed if you want the notification to open the app when pressed
                            pressAction: {
                                id: 'transactions',
                            },
                        },
                    })
                }
            },
        )

        requestPushNotificationPermissions()

        return () => {
            unsubscribeLog()
            unsubscribeTransaction()
        }
    }, [t])

    useEffect(() => {
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            console.info('push notification received', remoteMessage)
        })

        return unsubscribe
    }, [])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ErrorBoundary fallback={props => <ErrorScreen {...props} />}>
                    <ReduxProvider store={store}>
                        <ProviderComposer
                            providers={[
                                EnvironmentProvider,
                                FederationsProvider,
                                BackupRecoveryProvider,
                            ]}>
                            {bridgeIsReady && <Router />}
                            <CustomToast />
                        </ProviderComposer>
                    </ReduxProvider>
                </ErrorBoundary>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
