import { ThemeProvider } from '@rneui/themed'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Platform } from 'react-native'
import RNFS from 'react-native-fs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import SplashScreen from 'react-native-splash-screen'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    fetchRegisteredDevices,
    fetchSocialRecovery,
    initializeDeviceId,
    joinDefaultGroupChats,
    refreshFederations,
    selectDeviceId,
    setDeviceIndexRequired,
    setShouldLockDevice,
    startMatrixClient,
} from '@fedi/common/redux'
import { selectHasLoadedFromStorage } from '@fedi/common/redux/storage'
import { TransactionEvent } from '@fedi/common/types'
import {
    DeviceRegistrationEvent,
    LogEvent,
    PanicEvent,
} from '@fedi/common/types/bindings'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint, initializeBridge, subscribeToBridgeEvents } from '../bridge'
import { ErrorScreen } from '../screens/ErrorScreen'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import theme from '../styles/theme'
import { generateDeviceId } from '../utils/device-info'
import { displayPaymentReceivedNotification } from '../utils/notifications'

const log = makeLog('FediBridgeInitializer')

interface Props {
    children: React.ReactNode
}

export const FediBridgeInitializer: React.FC<Props> = ({ children }) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const [bridgeIsReady, setBridgeIsReady] = useState<boolean>(false)
    const [bridgeError, setBridgeError] = useState<unknown>()
    const deviceId = useAppSelector(selectDeviceId)
    const hasLoadedStorage = useAppSelector(selectHasLoadedFromStorage)
    const dispatchRef = useUpdatingRef(dispatch)

    // Initialize device ID
    useEffect(() => {
        const handleDeviceId = async () => {
            await dispatch(
                initializeDeviceId({ getDeviceId: generateDeviceId }),
            ).unwrap()
        }
        if (!deviceId && hasLoadedStorage) handleDeviceId()
    }, [deviceId, dispatch, hasLoadedStorage])

    // Initialize Native Event Listeners
    useEffect(() => {
        const subscribe = async () => {
            const subscriptions = await subscribeToBridgeEvents()
            log.info('initialized bridge listeners')
            return subscriptions
        }
        const listeners = subscribe()

        // Cleanup native event listeners
        return () => {
            listeners.then(subs => subs.map(s => s.remove()))
        }
    }, [])

    // Initialize redux store and bridge
    useEffect(() => {
        if (!deviceId) return
        log.info(
            'initializing connection to federation',
            RNFS.DocumentDirectoryPath,
        )
        const start = Date.now()
        initializeBridge(RNFS.DocumentDirectoryPath, deviceId)
            .then(() => {
                const stop = Date.now()
                log.info('initialized:', stop - start, 'ms OS:', Platform.OS)
                return fedimint.bridgeStatus()
            })
            .then(status => {
                log.info('bridgeStatus', status)
                // These all happen in parallel after bridge is initialized
                // Only throw (via unwrap) for refreshFederations.
                return Promise.all([
                    dispatchRef.current(refreshFederations(fedimint)).unwrap(),
                    dispatchRef.current(fetchSocialRecovery(fedimint)),
                    // this happens when the user entered seed words but quit the app
                    // before completing device index selection so we fetch devices
                    // again since that typically gets fetched from recoverFromMnemonic
                    ...(status?.deviceIndexAssignmentStatus === 'unassigned'
                        ? [
                              dispatchRef.current(setDeviceIndexRequired(true)),
                              dispatchRef.current(
                                  // TODO: make sure this is offline-friendly? should it be?
                                  fetchRegisteredDevices(fedimint),
                              ),
                          ]
                        : []),
                    // if there is no matrix session yet we will start the matrix
                    // client either during recovery or during onboarding after a
                    // display name is entered
                    ...(status?.matrixSetup
                        ? [dispatchRef.current(startMatrixClient({ fedimint }))]
                        : []),
                ])
            })
            .then(() => {
                setBridgeIsReady(true)
                dispatchRef.current(joinDefaultGroupChats())
            })
            .catch(err => {
                log.error(
                    `bridge failed to initialize after ${Date.now() - start}ms`,
                    err,
                )
                setBridgeError(err)
            })
            .finally(() => {
                SplashScreen.hide()
            })
    }, [deviceId, dispatchRef])

    useEffect(() => {
        // Initialize logger
        const unsubscribeLog = fedimint.addListener(
            'log',
            (event: LogEvent) => {
                // Strip escape characters
                const stripped = event.log.replace('\\', '')
                log.info('OS:', Platform.OS, `": log" -> "${stripped}"`)
            },
        )

        // Initialize push notification sender
        const unsubscribeTransaction = fedimint.addListener(
            'transaction',
            async (event: TransactionEvent) =>
                await displayPaymentReceivedNotification(event, t),
        )

        // Initialize panic listener
        const unsubscribePanic = fedimint.addListener(
            'panic',
            (event: PanicEvent) => {
                log.error('bridge panic', event)
                setBridgeError(event)
                SplashScreen.hide()
            },
        )

        // Initialize locked device listener
        const unsubscribeDeviceRegistration = fedimint.addListener(
            'deviceRegistration',
            (event: DeviceRegistrationEvent) => {
                log.info('DeviceRegistrationEvent', event)
                if (event.state === 'conflict') {
                    dispatchRef.current(setShouldLockDevice(true))
                }
            },
        )

        return () => {
            unsubscribeLog()
            unsubscribeTransaction()
            unsubscribePanic()
            unsubscribeDeviceRegistration()
        }
    }, [dispatchRef, t])

    if (bridgeIsReady && !bridgeError) {
        return <>{children}</>
    }

    if (bridgeError) {
        return (
            <SafeAreaProvider>
                <ThemeProvider theme={theme}>
                    <ErrorScreen error={bridgeError} />
                </ThemeProvider>
            </SafeAreaProvider>
        )
    }

    return null
}

export default FediBridgeInitializer
