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
    selectSocialRecoveryQr,
    selectMatrixStarted,
    startMatrixClient,
    setMatrixDisplayName,
    setMatrixSetup,
    selectMatrixStatus,
} from '@fedi/common/redux'
import { selectHasLoadedFromStorage } from '@fedi/common/redux/storage'
import { MatrixSyncStatus } from '@fedi/common/types'
import { generateRandomDisplayName } from '@fedi/common/utils/chat'
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
    const { asPath, pathname, query } = useRouter()

    const started = useAppSelector(selectMatrixStarted)
    const hasLoadedStorage = useAppSelector(selectHasLoadedFromStorage)
    const socialRecoveryId = useAppSelector(selectSocialRecoveryQr)
    const isMatrixSetup = useAppSelector(s => s.matrix.setup)
    const syncStatus = useAppSelector(selectMatrixStatus)

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

                // if matrix has been setup then make this available in state
                if (status.matrixSetup) {
                    dispatchRef.current(setMatrixSetup(true))

                    return dispatchRef
                        .current(startMatrixClient({ fedimint }))
                        .unwrap()
                }
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

    // Listen for matrix "synced" so display name can be set
    // This should only ever happen once because isMatrixSetup
    // will always be true from this point
    useEffect(() => {
        if (syncStatus === MatrixSyncStatus.synced && !isMatrixSetup) {
            dispatch(
                setMatrixDisplayName({
                    displayName: generateRandomDisplayName(2),
                }),
            )
            dispatch(setMatrixSetup(true))
        }
    }, [dispatch, isMatrixSetup, syncStatus])

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

    // If mid social recovery, force them to stay on the page
    if (socialRecoveryId && asPath !== '/onboarding/recover/social') {
        return <Redirect path="/onboarding/recover/social" />
    }

    // If matrix hasn't been initialized redirect to Welcome page
    // but allow access to onboarding/recovery routes
    // (Note: we could move all recovery pages out of /onboarding route and into /recover)
    if (
        syncStatus === MatrixSyncStatus.uninitialized &&
        pathname !== '/' &&
        !asPath.includes('recover')
    ) {
        return <Redirect path="/" />
    }

    // If invite code in query string but user has already onboarded
    // then go straight to join federation page
    if (query.invite_code && pathname === '/' && isMatrixSetup) {
        return (
            <Redirect
                path={`/onboarding/join?invite_code=${query.invite_code}`}
            />
        )
    }

    // If user has onboarded and no invite code in query string then
    // redirect user to /home
    if (isMatrixSetup && !query.invite_code && asPath === '/') {
        return <Redirect path="/home" />
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
