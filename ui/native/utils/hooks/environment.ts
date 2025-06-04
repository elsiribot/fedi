import NetInfo from '@react-native-community/netinfo'
import { useCallback } from 'react'

import { setIsInternetUnreachable } from '@fedi/common/redux'

import { useAppDispatch } from '../../state/hooks'
import { checkIsInternetUnreachable } from '../environment'

/**
 * Exposes a function that refetches the internet connection status and updates the redux store
 */
export const useRecheckInternet = () => {
    const dispatch = useAppDispatch()

    return useCallback(async () => {
        const netInfo = await NetInfo.fetch()
        const isUnreachable = checkIsInternetUnreachable(netInfo)

        dispatch(setIsInternetUnreachable(isUnreachable))

        return { isOffline: isUnreachable, isOnline: !isUnreachable }
    }, [dispatch])
}
