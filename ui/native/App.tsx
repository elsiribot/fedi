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
import { selectFederations } from '@fedi/common/redux'
import { TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { makeLog } from '@fedi/common/utils/log'

import Router from './Router'
import { fedimint, initializeBridge } from './bridge'
import CustomToast from './components/ui/CustomToast'
import ToastManager from './components/ui/ToastManager'
import { ErrorScreen } from './screens/ErrorScreen'
import { BackupRecoveryProvider } from './state/contexts/BackupRecoveryContext'
import { EnvironmentProvider } from './state/contexts/EnvironmentContext'
import { OmniLinkContextProvider } from './state/contexts/OmniLinkContext'
import ProviderComposer from './state/contexts/ProviderComposer'
import { initializeNativeStore, store } from './state/store'
import theme from './styles/theme'

const log = makeLog('App')

const App = () => {
    const { t } = useTranslation()
    const [bridgeIsReady, setBridgeIsReady] = useState<boolean>(false)
    const [bridgeError, setBridgeError] = useState<unknown>()

    // Initialize bridge
    useEffect(() => {
        async function onInitializeBridge() {
            log.info(
                'initializing connection to federation',
                RNFS.DocumentDirectoryPath,
            )
            const start = Date.now()
            try {
                await initializeBridge(RNFS.DocumentDirectoryPath)
            } catch (err) {
                setBridgeError(err)
                return
            }
            setBridgeIsReady(true)
            const stop = Date.now()
            log.info('initialized:', stop - start, 'ms OS:', Platform.OS)
        }
        onInitializeBridge()
    }, [])

    // Initialize redux store
    useEffect(() => {
        const unsubscribe = initializeNativeStore()
        return unsubscribe
    }, [])

    useEffect(() => {
        // Initialize logger
        const unsubscribeLog = fedimint.addListener('log', event => {
            // Strip escape characters
            const stripped = event.log.replace('\\', '')
            log.info('OS:', Platform.OS, `": log" -> "${stripped}"`)
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
                    const { amount, onchainState, oobState } = event.transaction
                    // dont show notification for onchain txn until it is claimed
                    if (onchainState && onchainState.type !== 'claimed') return
                    // dont show notification for ecash txn until it is done
                    if (oobState && oobState.type !== 'done') return

                    const federations = selectFederations(store.getState())
                    const federation = federations.find(
                        f => f.id === event.federationId,
                    )
                    await notifee.displayNotification({
                        title: federation
                            ? `${federation.name}: ${t(
                                  'phrases.transaction-received',
                              )}`
                            : t('phrases.transaction-received'),
                        body: `${amountUtils.formatNumber(
                            amountUtils.msatToSat(amount),
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

        // Initialize panic listener
        const unsubscribePanic = fedimint.addListener('panic', event => {
            log.error('bridge panic', event)
            setBridgeError(event)
        })

        return () => {
            unsubscribeLog()
            unsubscribeTransaction()
            unsubscribePanic()
        }
    }, [t])

    useEffect(() => {
        const unsubscribe = messaging().onMessage(async remoteMessage => {
            log.info('push notification received', remoteMessage)
        })

        return unsubscribe
    }, [])

    if (bridgeError) {
        return (
            <SafeAreaProvider>
                <ThemeProvider theme={theme}>
                    <ErrorScreen error={bridgeError} />
                </ThemeProvider>
            </SafeAreaProvider>
        )
    }

    return (
        <SafeAreaProvider>
            <ThemeProvider theme={theme}>
                <ErrorBoundary fallback={props => <ErrorScreen {...props} />}>
                    <ReduxProvider store={store}>
                        <ProviderComposer
                            providers={[
                                EnvironmentProvider,
                                BackupRecoveryProvider,
                                OmniLinkContextProvider,
                            ]}>
                            {bridgeIsReady && <Router />}
                            <CustomToast />
                            <ToastManager />
                        </ProviderComposer>
                    </ReduxProvider>
                </ErrorBoundary>
            </ThemeProvider>
        </SafeAreaProvider>
    )
}

export default App
