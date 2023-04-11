import notifee from '@notifee/react-native'
import { ThemeProvider } from '@rneui/themed'
import * as Sentry from '@sentry/react-native'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Provider as ReduxProvider } from 'react-redux'

import { TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import Router from './Router'
import {
    BridgeEventEmitter,
    initializeBridge,
    LogEvent,
    TransactionEvent,
} from './bridge'
import CustomToast from './components/ui/CustomToast'
import { BackupRecoveryProvider } from './state/contexts/BackupRecoveryContext'
import { ChatProvider } from './state/contexts/ChatContext'
import { EnvironmentProvider } from './state/contexts/EnvironmentContext'
import { FederationsProvider } from './state/contexts/FederationsContext'
import ProviderComposer from './state/contexts/ProviderComposer'
import { initializeNativeStore, store } from './state/store'
import theme from './styles/theme'

// Initialize Sentry SDK
// Construct a new instrumentation instance. This is needed to communicate between the integration and React
const routingInstrumentation = new Sentry.ReactNavigationInstrumentation()
// TODO: Remove Sentry or configure opt-in for production deployment
Sentry.init({
    environment: __DEV__ ? 'development' : 'production',
    dsn: 'https://f59b28d775f34a0cb2016dc898d61657@o4504872692940800.ingest.sentry.io/4504872696348672',
    tracesSampleRate: 1.0,
    integrations: [
        new Sentry.ReactNativeTracing({
            // Pass instrumentation to be used as `routingInstrumentation`
            routingInstrumentation,
        }),
    ],
})

const App = () => {
    const { t } = useTranslation()
    const [bridgeIsReady, setBridgeIsReady] = useState<boolean>(false)

    async function onInitializeBridge() {
        console.log(
            'initializing connection to federation',
            RNFS.DocumentDirectoryPath,
        )
        const start = Date.now()
        await initializeBridge(RNFS.DocumentDirectoryPath)
        setBridgeIsReady(true)
        const stop = Date.now()
        console.log('initialized:', stop - start, 'ms OS:', Platform.OS)
    }

    async function requestPushNotificationPermissions() {
        await notifee.requestPermission()
    }

    // Initialize redux store
    useEffect(() => initializeNativeStore(), [])

    useEffect(() => {
        const emitter = new BridgeEventEmitter()

        // Initialize logger
        const logHandler = (event: LogEvent) => {
            console.log('OS:', Platform.OS, `": log" -> "${event.log}"`)
        }
        const logListener = emitter.onLog(logHandler)

        // Initialize push notification sender
        async function onDisplayNotification(event: TransactionEvent) {
            // Create a channel (required for Android)
            const channelId = await notifee.createChannel({
                id: 'transactions',
                name: 'Transactions Channel',
            })

            // Display notifications only for incoming transactions
            if (event.transaction.direction === TransactionDirection.receive) {
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
        }
        const transactionListener = emitter.onTransaction(onDisplayNotification)

        onInitializeBridge()
        requestPushNotificationPermissions()

        return () => {
            logListener.remove()
            transactionListener.remove()
        }
    }, [t])

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ReduxProvider store={store}>
                    <ProviderComposer
                        providers={[
                            EnvironmentProvider,
                            FederationsProvider,
                            ChatProvider,
                            BackupRecoveryProvider,
                        ]}>
                        {bridgeIsReady && (
                            <Router
                                routingInstrumentation={routingInstrumentation}
                            />
                        )}
                        <CustomToast />
                    </ProviderComposer>
                </ReduxProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default Sentry.wrap(App)
