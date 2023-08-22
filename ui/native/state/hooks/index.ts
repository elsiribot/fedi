import messaging from '@react-native-firebase/messaging'
import {
    MutableRefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
} from 'react'
import { AppStateStatus, AppState as RNAppState } from 'react-native'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'

import { usePublishNotificationToken } from '@fedi/common/hooks/chat'
import {
    ensureHealthyXmppStream,
    selectBtcExchangeRate,
    selectChatXmppClient,
    selectCurrency,
} from '@fedi/common/redux'
import { SupportedCurrency } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../../bridge'
import { MSats, Sats } from '../../types'
import type { AppDispatch, AppState } from '../store'

/**
 * Provides a `dispatch` function that allows you to dispatch redux actions.
 */
export const useAppDispatch: () => AppDispatch = useDispatch

/**
 * Provides application state from redux, given a selector.
 */
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export const useBtcFiatPrice = () => {
    const selectedFiatCurrency = useAppSelector(selectCurrency)
    const exchangeRate: number = useAppSelector(selectBtcExchangeRate)

    return {
        convertSatsToFiat: useCallback(
            (sats: Sats) => {
                return amountUtils.satToFiat(sats, exchangeRate)
            },
            [exchangeRate],
        ),
        convertSatsToFiatString: useCallback(
            (sats: Sats) => {
                return amountUtils.satToFiatString(sats, exchangeRate)
            },
            [exchangeRate],
        ),
        convertSatsToFormattedFiat: useCallback(
            (sats: Sats) => {
                const amount = amountUtils.satToFiatString(sats, exchangeRate)

                let currencySymbol
                switch (selectedFiatCurrency) {
                    case SupportedCurrency.USD:
                        currencySymbol = `$`
                        break
                    case SupportedCurrency.EUR:
                        currencySymbol = `€`
                        break
                    case SupportedCurrency.CFA:
                        currencySymbol = `CFA `
                        break
                    case SupportedCurrency.CZK:
                        currencySymbol = `CZK `
                        break
                    default:
                        currencySymbol = `$`
                }
                return `${currencySymbol}${amount}`
            },
            [exchangeRate, selectedFiatCurrency],
        ),
    }
}

export const useBridge = () => {
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )

    return {
        addressOrInvoice: useCallback(
            (input: string) => {
                return fedimint.addressOrInvoice(input, activeFederationId!)
            },
            [activeFederationId],
        ),
        approveSocialRecoveryRequest: useCallback(
            (recoveryId: string, peerId: number, password: string) => {
                return fedimint.approveSocialRecoveryRequest(
                    recoveryId,
                    peerId,
                    password,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        authenticateGuardian: useCallback(
            (secret: string) => {
                return fedimint.authenticateGuardian(
                    secret,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        recoveryQr: useCallback(() => {
            return fedimint.recoveryQr(activeFederationId!)
        }, [activeFederationId]),
        leaveFederation: useCallback(() => {
            return fedimint.leaveFederation(activeFederationId!)
        }, [activeFederationId]),
        generateAddress: useCallback(() => {
            return fedimint.generateAddress(activeFederationId!)
        }, [activeFederationId]),
        socialRecoveryApprovals: useCallback(() => {
            return fedimint.socialRecoveryApprovals(activeFederationId!)
        }, [activeFederationId]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return fedimint.generateEcash(amount, activeFederationId!)
            },
            [activeFederationId],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return fedimint.generateInvoice(
                    amount,
                    description,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        getMnemonic: useCallback(() => {
            return fedimint.getMnemonic(activeFederationId!)
        }, [activeFederationId]),
        listTransactions: useCallback(() => {
            return fedimint.listTransactions(activeFederationId!)
        }, [activeFederationId]),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return fedimint.updateTransactionNotes(
                    transactionId,
                    notes,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        getNostrPubKey: useCallback(() => {
            return fedimint.getNostrPubKey(activeFederationId!)
        }, [activeFederationId]),
        signNostrEvent: useCallback(
            (eventHash: string) => {
                return fedimint.signNostrEvent(eventHash, activeFederationId!)
            },
            [activeFederationId],
        ),
        listGateways: useCallback(() => {
            return fedimint.listGateways(activeFederationId!)
        }, [activeFederationId]),
        switchGateway: useCallback(
            (nodePubKey: string) => {
                return fedimint.switchGateway(nodePubKey, activeFederationId!)
            },
            [activeFederationId],
        ),
        locateRecoveryFile: useCallback(() => {
            return fedimint.locateRecoveryFile(activeFederationId!)
        }, [activeFederationId]),
        completeSocialRecovery: useCallback(() => {
            return fedimint.completeSocialRecovery(activeFederationId!)
        }, [activeFederationId]),
        payInvoice: useCallback(
            (invoice: string) => {
                return fedimint.payInvoice(invoice, activeFederationId!)
            },
            [activeFederationId],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return fedimint.payAddress(address, sats, activeFederationId!)
            },
            [activeFederationId],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return fedimint.receiveEcash(ecash, activeFederationId!)
            },
            [activeFederationId],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return fedimint.recoverFromMnemonic(
                    mnemonic,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return fedimint.denySocialRecoveryRequest(
                    userPublicKey,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        socialRecoveryDownloadVerificationDoc: useCallback(
            (recoveryId: string) => {
                return fedimint.socialRecoveryDownloadVerificationDoc(
                    recoveryId,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        validateRecoveryFile: useCallback(
            (file: string) => {
                return fedimint.validateRecoveryFile(file, activeFederationId!)
            },
            [activeFederationId],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return fedimint.validateEcash(ecash, activeFederationId!)
            },
            [activeFederationId],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return fedimint.uploadBackupFile(
                    videoFilePath,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
        getXmppCredentials: useCallback(() => {
            return fedimint.getXmppCredentials(activeFederationId!)
        }, [activeFederationId]),
        backupXmppUsername: useCallback(
            (username: string) => {
                return fedimint.backupXmppUsername(
                    username,
                    activeFederationId!,
                )
            },
            [activeFederationId],
        ),
    }
}

export const useXmppHealthCheck = () => {
    const appStateRef = useRef<AppStateStatus>(
        RNAppState.currentState,
    ) as MutableRefObject<AppStateStatus>
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const xmppClient = useAppSelector(selectChatXmppClient)

    // This logic is needed to help gracefully resume the XMPP websocket stream
    useEffect(() => {
        if (!xmppClient) return

        // Subscribe to changes in AppState to detect when app goes from
        // background to foreground
        const subscription = RNAppState.addEventListener(
            'change',
            nextAppState => {
                if (
                    appStateRef.current.match(/inactive|background/) &&
                    nextAppState === 'active'
                ) {
                    dispatch(
                        ensureHealthyXmppStream({
                            fedimint,
                            federationId: activeFederationId as string,
                        }),
                    )
                }
                appStateRef.current = nextAppState
            },
        )
        return () => subscription.remove()
    }, [activeFederationId, dispatch, xmppClient])
}

// This hook gets the device's FCM token and publishes it
// to the XMPP server if chat is supported
export const useXmppPushNotifications = async () => {
    const getDeviceToken = useMemo(() => {
        return () => messaging().getToken()
    }, [])
    usePublishNotificationToken(getDeviceToken)
}
