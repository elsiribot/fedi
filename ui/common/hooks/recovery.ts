import { TFunction } from 'i18next'
import { useCallback, useEffect, useState } from 'react'

import {
    fetchSocialRecovery as reduxFetchSocialRecovery,
    completeSocialRecovery as reduxCompleteSocialRecovery,
    cancelSocialRecovery as reduxCancelSocialRecovery,
    refreshSocialRecoveryState,
    selectHasCheckedForSocialRecovery,
    selectSocialRecoveryQr,
    selectSocialRecoveryState,
    recoverFromMnemonic,
} from '../redux'
import { SeedWords } from '../types'
import { FedimintBridge } from '../utils/fedimint'
import { useCommonDispatch, useCommonSelector } from './redux'
import { useToast } from './toast'

export function useSocialRecovery(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const hasCheckedForSocialRecovery = useCommonSelector(
        selectHasCheckedForSocialRecovery,
    )
    const socialRecoveryQr = useCommonSelector(selectSocialRecoveryQr)
    const socialRecoveryState = useCommonSelector(selectSocialRecoveryState)
    const [isCompletingRecovery, setIsCompletingRecovery] = useState(false)
    const [isCancelingRecovery, setIsCancelingRecovery] = useState(false)

    const fetchSocialRecovery = useCallback(() => {
        return dispatch(reduxFetchSocialRecovery(fedimint)).unwrap()
    }, [dispatch, fedimint])

    const completeSocialRecovery = useCallback(async () => {
        setIsCompletingRecovery(true)
        try {
            return await dispatch(
                reduxCompleteSocialRecovery({ fedimint }),
            ).unwrap()
        } finally {
            setIsCompletingRecovery(false)
        }
    }, [dispatch, fedimint])

    const cancelSocialRecovery = useCallback(async () => {
        setIsCancelingRecovery(true)
        try {
            return dispatch(reduxCancelSocialRecovery(fedimint)).unwrap()
        } finally {
            setIsCancelingRecovery(false)
        }
    }, [dispatch, fedimint])

    // Refresh social recovery state every 3 seconds while recovering.
    useEffect(() => {
        if (!socialRecoveryQr) return
        const refresh = async () => {
            await dispatch(refreshSocialRecoveryState(fedimint))
            timeout = setTimeout(refresh, 3000)
        }
        let timeout = setTimeout(refresh, 3000)
        return () => clearTimeout(timeout)
    }, [dispatch, fedimint, socialRecoveryQr])

    return {
        hasCheckedForSocialRecovery,
        socialRecoveryQr,
        socialRecoveryState,
        isCompletingRecovery,
        isCancelingRecovery,
        fetchSocialRecovery,
        completeSocialRecovery,
        cancelSocialRecovery,
    }
}

export function usePersonalRecovery(t: TFunction, fedimint: FedimintBridge) {
    const [recoveryInProgress, setRecoveryInProgress] = useState<boolean>(false)
    const dispatch = useCommonDispatch()
    const toast = useToast()

    const attemptRecovery = useCallback(
        async (seedWords: SeedWords, onSuccess: () => void) => {
            setRecoveryInProgress(true)
            try {
                await dispatch(
                    recoverFromMnemonic({
                        fedimint,
                        mnemonic: seedWords,
                    }),
                ).unwrap()
                onSuccess()
            } catch (err) {
                toast.error(t, 'errors.recovery-failed')
            } finally {
                setRecoveryInProgress(false)
            }
        },
        [dispatch, fedimint, t, toast],
    )

    return {
        recoveryInProgress,
        attemptRecovery,
    }
}
