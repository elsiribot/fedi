import { useCallback, useEffect, useState } from 'react'

import {
    fetchSocialRecovery as reduxFetchSocialRecovery,
    completeSocialRecovery as reduxCompleteSocialRecovery,
    cancelSocialRecovery as reduxCancelSocialRecovery,
    refreshSocialRecoveryState,
    selectHasCheckedForSocialRecovery,
    selectSocialRecoveryId,
    selectSocialRecoveryState,
} from '../redux'
import { FedimintBridge } from '../utils/fedimint'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useSocialRecovery(fedimint: FedimintBridge) {
    const dispatch = useCommonDispatch()
    const hasCheckedForSocialRecovery = useCommonSelector(
        selectHasCheckedForSocialRecovery,
    )
    const socialRecoveryId = useCommonSelector(selectSocialRecoveryId)
    const socialRecoveryState = useCommonSelector(selectSocialRecoveryState)
    const [isCompletingRecovery, setIsCompletingRecovery] = useState(false)
    const [isCancelingRecovery, setIsCancelingRecovery] = useState(false)

    const fetchSocialRecovery = useCallback(() => {
        return dispatch(reduxFetchSocialRecovery(fedimint)).unwrap()
    }, [dispatch, fedimint])

    const completeSocialRecovery = useCallback(async () => {
        setIsCompletingRecovery(true)
        try {
            return dispatch(reduxCompleteSocialRecovery({ fedimint })).unwrap()
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
        if (!socialRecoveryId) return
        const refresh = async () => {
            await dispatch(refreshSocialRecoveryState(fedimint))
            timeout = setTimeout(refresh, 3000)
        }
        let timeout = setTimeout(refresh, 3000)
        return () => clearTimeout(timeout)
    }, [dispatch, fedimint, socialRecoveryId])

    return {
        hasCheckedForSocialRecovery,
        socialRecoveryId,
        socialRecoveryState,
        isCompletingRecovery,
        isCancelingRecovery,
        fetchSocialRecovery,
        completeSocialRecovery,
        cancelSocialRecovery,
    }
}
