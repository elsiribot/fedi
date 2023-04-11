import {
    DependencyList,
    EffectCallback,
    useCallback,
    useEffect,
    useRef,
} from 'react'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

import { LightningGateway } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../../bridge'
import { MSats, Sats } from '../../types'
import lnurlUtils from '../../utils/LNURLUtils'
import { useFederationsContext } from '../contexts/FederationsContext'
import type { AppState, AppDispatch } from '../store'

/**
 * Provides a `dispatch` function that allows you to dispatch redux actions.
 */
export const useAppDispatch: () => AppDispatch = useDispatch

/**
 * Provides application state from redux, given a selector.
 */
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector

export const useDebouncedEffect = (
    effect: EffectCallback,
    deps: DependencyList,
    delay: number,
) => {
    useEffect(() => {
        const handler = setTimeout(() => effect(), delay)

        return () => clearTimeout(handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...(deps || []), delay])
}

export const usePrevious = <T extends unknown>(value: T): T | undefined => {
    const ref = useRef<T>()
    useEffect(() => {
        ref.current = value
    })
    return ref.current
}

export const useBtcUsdPrice = () => {
    const btcUsdPrice = useAppSelector(s => s.currency.btcUsdPrice)
    return {
        convertSatsToUsd: useCallback(
            (sats: Sats) => {
                return amountUtils.satToUsd(sats, btcUsdPrice)
            },
            [btcUsdPrice],
        ),
        convertSatsToUsdString: useCallback(
            (sats: Sats) => {
                return amountUtils.satToUsdString(sats, btcUsdPrice)
            },
            [btcUsdPrice],
        ),
    }
}

export const useBridge = () => {
    const { state } = useFederationsContext()
    const { selectedFederationId } = state

    return {
        addressOrInvoice: useCallback(
            (input: string) => {
                return fedimint.addressOrInvoice(input, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        approveSocialRecoveryRequest: useCallback(
            (recoveryId: string, peerId: number, password: string) => {
                return fedimint.approveSocialRecoveryRequest(
                    recoveryId,
                    peerId,
                    password,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        authenticateGuardian: useCallback(
            (secret: string) => {
                return fedimint.authenticateGuardian(
                    secret,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        recoveryQr: useCallback(() => {
            return fedimint.recoveryQr(selectedFederationId!)
        }, [selectedFederationId]),
        leaveFederation: useCallback(() => {
            return fedimint.leaveFederation(selectedFederationId!)
        }, [selectedFederationId]),
        generateAddress: useCallback(() => {
            return fedimint.generateAddress(selectedFederationId!)
        }, [selectedFederationId]),
        socialRecoveryApprovals: useCallback(() => {
            return fedimint.socialRecoveryApprovals(selectedFederationId!)
        }, [selectedFederationId]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return fedimint.generateEcash(amount, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return fedimint.generateInvoice(
                    amount,
                    description,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        getMnemonic: useCallback(() => {
            return fedimint.getMnemonic(selectedFederationId!)
        }, [selectedFederationId]),
        listTransactions: useCallback(() => {
            return fedimint.listTransactions(selectedFederationId!)
        }, [selectedFederationId]),
        lnurlSignMessage: useCallback(
            (url: string) => {
                return fedimint.lnurlSignMessage(url, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        lnurlGetToken: useCallback(
            (lnurl: string) => {
                return lnurlUtils.getToken(
                    fedimint,
                    lnurl,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return fedimint.updateTransactionNotes(
                    transactionId,
                    notes,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        listGateways: useCallback(() => {
            return fedimint.listGateways(selectedFederationId!)
        }, [selectedFederationId]),
        switchGateway: useCallback(
            (gateway: LightningGateway) => {
                return fedimint.switchGateway(gateway, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        locateRecoveryFile: useCallback(() => {
            return fedimint.locateRecoveryFile(selectedFederationId!)
        }, [selectedFederationId]),
        completeSocialRecovery: useCallback(() => {
            return fedimint.completeSocialRecovery(selectedFederationId!)
        }, [selectedFederationId]),
        payInvoice: useCallback(
            (invoice: string) => {
                return fedimint.payInvoice(invoice, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return fedimint.payAddress(address, sats, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return fedimint.receiveEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return fedimint.recoverFromMnemonic(
                    mnemonic,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return fedimint.denySocialRecoveryRequest(
                    userPublicKey,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        socialRecoveryDownloadVerificationDoc: useCallback(
            (recoveryId: string) => {
                return fedimint.socialRecoveryDownloadVerificationDoc(
                    recoveryId,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        validateRecoveryFile: useCallback(
            (file: string) => {
                return fedimint.validateRecoveryFile(
                    file,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return fedimint.validateEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return fedimint.uploadBackupFile(
                    videoFilePath,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        getXmppCredentials: useCallback(() => {
            return fedimint.getXmppCredentials(selectedFederationId!)
        }, [selectedFederationId]),
        backupXmppUsername: useCallback(
            (username: string) => {
                return fedimint.backupXmppUsername(
                    username,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
    }
}
