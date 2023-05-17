import { selectActiveFederation } from '../redux'
import { SupportedFeature } from '../types'
import { shouldShowOnchainDeposits } from '../utils/FederationUtils'
import {
    shouldShowOfflineWallet,
    shouldShowSocialRecovery,
    shouldShowInviteCode,
    getSupportedFeatures,
} from '../utils/FederationUtils'
import { useCommonSelector } from './redux'

export function useIsChatSupported() {
    const activeFederation = useCommonSelector(selectActiveFederation)
    if (!activeFederation) return false
    return getSupportedFeatures(activeFederation.meta).includes(
        SupportedFeature.chat_server_domain,
    )
}

export function useIsInviteSupported() {
    const activeFederation = useCommonSelector(selectActiveFederation)
    if (!activeFederation) return false
    return shouldShowInviteCode(activeFederation.meta)
}

export function useIsSocialRecoverySupported() {
    const activeFederation = useCommonSelector(selectActiveFederation)
    if (!activeFederation) return false
    return shouldShowSocialRecovery(activeFederation.meta)
}

export function useIsOfflineWalletSupported() {
    const activeFederation = useCommonSelector(selectActiveFederation)
    if (!activeFederation) return false
    return shouldShowOfflineWallet(activeFederation.meta)
}

export function useIsOnchainDepositSupported() {
    const activeFederation = useCommonSelector(selectActiveFederation)
    if (!activeFederation) return false
    return shouldShowOnchainDeposits(activeFederation.meta)
}
