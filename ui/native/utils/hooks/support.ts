import { useNavigation } from '@react-navigation/native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'

import { useToast } from '@fedi/common/hooks/toast'
import { selectNostrNpub } from '@fedi/common/redux'
import {
    selectSupportPermissionGranted,
    selectZendeskInitialized,
    setZendeskInitialized,
} from '@fedi/common/redux/support'

import { useAppDispatch } from '../../state/hooks'
import { NavigationHook } from '../../types/navigation'
import {
    useDisplayName,
    zendeskInitialize,
    zendeskOpenMessagingView,
} from '../support'

export function useLaunchZendesk() {
    const dispatch = useAppDispatch()
    const navigation = useNavigation<NavigationHook>()
    const toast = useToast()
    const { t } = useTranslation()

    const nostrNpub = useSelector(selectNostrNpub)
    const displayName = useDisplayName()
    const supportPermissionGranted = useSelector(selectSupportPermissionGranted)
    const zendeskInitialized = useSelector(selectZendeskInitialized)

    const onError = useCallback(
        (error: Error) => {
            toast.error(
                t,
                error,
                'feature.support.zendesk-initialization-failed',
            )
        },
        [toast, t],
    )

    const handleZendeskInitialization = useCallback(
        (isInitialized: boolean) => {
            dispatch(setZendeskInitialized(isInitialized))
        },
        [dispatch],
    )

    // If permission isn't granted, navigate to HelpCentre to request it.
    // Otherwise, initialize Zendesk and open the messaging view.
    const launchZendesk = useCallback(
        async (newlyGranted = false) => {
            if (!supportPermissionGranted && !newlyGranted) {
                return navigation.navigate('HelpCentre')
            }

            if (!zendeskInitialized) {
                await zendeskInitialize(
                    nostrNpub ?? null,
                    displayName,
                    handleZendeskInitialization,
                    onError,
                )
            }

            await zendeskOpenMessagingView({ onError })
        },
        [
            zendeskInitialized,
            supportPermissionGranted,
            nostrNpub,
            displayName,
            handleZendeskInitialization,
            navigation,
            onError,
        ],
    )

    return { launchZendesk }
}
