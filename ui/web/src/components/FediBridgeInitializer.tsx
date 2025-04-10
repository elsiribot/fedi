import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import FediLogo from '@fedi/common/assets/svgs/fedi-logo-icon.svg'
import { useObserveMatrixSyncStatus } from '@fedi/common/hooks/matrix'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    fetchSocialRecovery,
    initializeDeviceIdWeb,
    initializeFedimintVersion,
    initializeNostrKeys,
    previewAllDefaultChats,
    refreshFederations,
    selectHasSetMatrixDisplayName,
    selectSocialRecoveryQr,
    selectMatrixStarted,
    startMatrixClient,
} from '@fedi/common/redux'
import { selectHasLoadedFromStorage } from '@fedi/common/redux/storage'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'

import { useAppDispatch, useAppSelector } from '../hooks'
import { fedimint, initializeBridge } from '../lib/bridge'
import { keyframes, styled, theme } from '../styles'
import { generateDeviceId } from '../utils/browserInfo'
import { Redirect } from './Redirect'
import { Text } from './Text'

const log = makeLog('FediBridgeInitializer')

interface Props {
    children: React.ReactNode
}

export const FediBridgeInitializer: React.FC<Props> = ({ children }) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { pathname } = useRouter()

    const started = useAppSelector(selectMatrixStarted)
    const hasLoadedStorage = useAppSelector(selectHasLoadedFromStorage)
    const socialRecoveryId = useAppSelector(selectSocialRecoveryQr)
    const hasSetDisplayName = useAppSelector(selectHasSetMatrixDisplayName)

    const tRef = useUpdatingRef(t)
    const dispatchRef = useUpdatingRef(dispatch)

    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)

    useObserveMatrixSyncStatus(started)

    useEffect(() => {
        if (!hasLoadedStorage) return

        const newDeviceId = generateDeviceId()

        dispatchRef
            .current(initializeDeviceIdWeb({ deviceId: newDeviceId }))
            .unwrap()
            .then(deviceId => initializeBridge(deviceId))
            .then(() => fedimint.bridgeStatus())
            .then(status => {
                log.info('bridgeStatus', status)

                // if matrix has been setup (typically after creating a displayName)
                // then start it here
                if (status.matrixSetup) {
                    return dispatchRef
                        .current(startMatrixClient({ fedimint }))
                        .unwrap()
                }

                return null
            })
            .then(() => {
                return Promise.all([
                    dispatchRef.current(
                        initializeFedimintVersion({ fedimint }),
                    ),
                    dispatchRef.current(fetchSocialRecovery(fedimint)),
                    dispatchRef.current(refreshFederations(fedimint)).unwrap(),
                    dispatchRef.current(initializeNostrKeys({ fedimint })),
                ])
            })
            .then(() => {
                dispatchRef.current(previewAllDefaultChats())
            })
            .catch(err =>
                setError(
                    formatErrorMessage(
                        tRef.current,
                        err,
                        'errors.unknown-error',
                    ),
                ),
            )
            .finally(() => setIsLoading(false))
    }, [dispatchRef, hasLoadedStorage, tRef])

    // Show an error message if the bridge panics while running.
    useEffect(() => {
        const unsubscribe = fedimint.addListener('panic', ev => {
            setError(ev.message)
        })
        return () => unsubscribe()
    }, [])

    if (isLoading) {
        return (
            <Content>
                <Loader>
                    <FediLogo width={50} />
                </Loader>
            </Content>
        )
    }

    if (error) {
        return (
            <Content>
                <ErrorMessage>
                    <Text>{error}</Text>
                </ErrorMessage>
            </Content>
        )
    }

    // // If we're mid social recovery, force them to stay on the page
    if (socialRecoveryId && pathname !== '/onboarding/recover/social') {
        return <Redirect path="/onboarding/recover/social" />
    }

    // If they haven't set a display name, force them into onboarding
    if (
        !hasSetDisplayName &&
        !pathname.startsWith('/onboarding') &&
        pathname !== '/'
    ) {
        return <Redirect path="/" />
    }

    return children
}

const loaderFadeIn = keyframes({
    '0%, 50%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const rotate = keyframes({
    '0%': {
        transform: 'rotate(0deg)',
    },
    '70%': {
        transform: 'rotate(360deg)',
    },
    '100%': {
        transform: 'rotate(360deg)',
    },
})

const Content = styled('div', {
    alignItems: 'center',
    display: 'flex',
    height: '100dvh',
    flexDirection: 'column',
    justifyContent: 'center',
    width: '100%',
})

const Loader = styled('div', {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    transformOrigin: 'center center',
    animation: `${rotate} 1.5s linear infinite, ${loaderFadeIn} 1s ease`,
})

const ErrorMessage = styled('div', {
    color: theme.colors.red,
    textAlign: 'center',
})
