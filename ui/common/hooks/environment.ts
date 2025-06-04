import { selectIsInternetUnreachable } from '../redux'
import { useCommonSelector } from './redux'

export function useInternetConnectivity() {
    const isOffline = useCommonSelector(selectIsInternetUnreachable)
    return { isOnline: !isOffline, isOffline }
}
