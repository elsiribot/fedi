import {
    DependencyList,
    EffectCallback,
    useCallback,
    useEffect,
    useRef,
} from 'react'
import {
    addressOrInvoice,
    approveSocialRecoveryRequest,
    authenticateGuardian,
    backupXmppUsername,
    completeSocialRecovery,
    denySocialRecoveryRequest,
    generateAddress,
    generateEcash,
    generateInvoice,
    getMnemonic,
    getXmppCredentials,
    leaveFederation,
    LightningGateway,
    listGateways,
    listTransactions,
    lnurlSignMessage,
    locateRecoveryFile,
    payAddress,
    payInvoice,
    receiveEcash,
    recoverFromMnemonic,
    recoveryQr,
    socialRecoveryApprovals,
    socialRecoveryDownloadVerificationDoc,
    switchGateway,
    updateTransactionNotes,
    uploadBackupFile,
    validateEcash,
    validateRecoveryFile,
} from '../../bridge'
import { MSats, Sats } from '../../types'
import amountUtils from '../../utils/AmountUtils'
import lnurlUtils from '../../utils/LNURLUtils'
import { useCurrencyContext } from '../contexts/CurrencyContext'
import { useFederationsContext } from '../contexts/FederationsContext'

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
    const { state } = useCurrencyContext()
    const { btcUsdPrice } = state
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
                return addressOrInvoice(input, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        approveSocialRecoveryRequest: useCallback(
            (recoveryId: string, peerId: number, password: string) => {
                return approveSocialRecoveryRequest(
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
                return authenticateGuardian(secret, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        recoveryQr: useCallback(() => {
            return recoveryQr(selectedFederationId!)
        }, [selectedFederationId]),
        leaveFederation: useCallback(() => {
            return leaveFederation(selectedFederationId!)
        }, [selectedFederationId]),
        generateAddress: useCallback(() => {
            return generateAddress(selectedFederationId!)
        }, [selectedFederationId]),
        socialRecoveryApprovals: useCallback(() => {
            return socialRecoveryApprovals(selectedFederationId!)
        }, [selectedFederationId]),
        generateEcash: useCallback(
            (amount: MSats) => {
                return generateEcash(amount, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        generateInvoice: useCallback(
            (amount: MSats, description: string) => {
                return generateInvoice(
                    amount,
                    description,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        getMnemonic: useCallback(() => {
            return getMnemonic(selectedFederationId!)
        }, [selectedFederationId]),
        listTransactions: useCallback(() => {
            return listTransactions(selectedFederationId!)
        }, [selectedFederationId]),
        lnurlSignMessage: useCallback(
            (url: string) => {
                return lnurlSignMessage(url, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        lnurlGetToken: useCallback(
            (lnurl: string) => {
                return lnurlUtils.getToken(lnurl, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        updateTransactionNotes: useCallback(
            (transactionId: string, notes: string) => {
                return updateTransactionNotes(
                    transactionId,
                    notes,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        listGateways: useCallback(() => {
            return listGateways(selectedFederationId!)
        }, [selectedFederationId]),
        switchGateway: useCallback(
            (gateway: LightningGateway) => {
                return switchGateway(gateway, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        locateRecoveryFile: useCallback(() => {
            return locateRecoveryFile(selectedFederationId!)
        }, [selectedFederationId]),
        completeSocialRecovery: useCallback(() => {
            return completeSocialRecovery(selectedFederationId!)
        }, [selectedFederationId]),
        payInvoice: useCallback(
            (invoice: string) => {
                return payInvoice(invoice, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        payAddress: useCallback(
            (address: string, sats: Sats) => {
                return payAddress(address, sats, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        receiveEcash: useCallback(
            (ecash: string) => {
                return receiveEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        recoverFromMnemonic: useCallback(
            (mnemonic: string[]) => {
                return recoverFromMnemonic(mnemonic, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        denySocialRecoveryRequest: useCallback(
            (userPublicKey: string) => {
                return denySocialRecoveryRequest(
                    userPublicKey,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        socialRecoveryDownloadVerificationDoc: useCallback(
            (recoveryId: string) => {
                return socialRecoveryDownloadVerificationDoc(
                    recoveryId,
                    selectedFederationId!,
                )
            },
            [selectedFederationId],
        ),
        validateRecoveryFile: useCallback(
            (file: string) => {
                return validateRecoveryFile(file, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        validateEcash: useCallback(
            (ecash: string) => {
                return validateEcash(ecash, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        uploadBackupFile: useCallback(
            (videoFilePath: string) => {
                return uploadBackupFile(videoFilePath, selectedFederationId!)
            },
            [selectedFederationId],
        ),
        getXmppCredentials: useCallback(() => {
            return getXmppCredentials(selectedFederationId!)
        }, [selectedFederationId]),
        backupXmppUsername: useCallback(
            (username: string) => {
                return backupXmppUsername(username, selectedFederationId!)
            },
            [selectedFederationId],
        ),
    }
}
