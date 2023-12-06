import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import FediLogo from '@fedi/common/assets/svgs/fedi-logo.svg'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    connectChat,
    disconnectChat,
    refreshFederations,
    selectActiveFederation,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useAppDispatch, useAppSelector } from '../hooks'
import { fedimint, initializeBridge } from '../lib/bridge'
import { keyframes, styled, theme } from '../styles'
import { Redirect } from './Redirect'
import { Text } from './Text'

interface Props {
    children: React.ReactNode
}

export const FediBridgeInitializer: React.FC<Props> = ({ children }) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { pathname } = useRouter()
    const activeFederation = useAppSelector(selectActiveFederation)
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isShowingLoading, setIsShowingLoading] = useState(false)
    const [error, setError] = useState<string>()
    const tRef = useUpdatingRef(t)
    const dispatchRef = useUpdatingRef(dispatch)
    const federationId = activeFederation?.id

    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            setIsShowingLoading(true)
        }, 1000)

        initializeBridge()
            .then(() =>
                dispatchRef.current(refreshFederations(fedimint)).unwrap(),
            )
            .then(() => setIsInitialized(true))
            .catch(err =>
                setError(
                    formatErrorMessage(
                        tRef.current,
                        err,
                        'errors.unknown-error',
                    ),
                ),
            )
            .finally(() => {
                setIsShowingLoading(false)
                clearTimeout(loadingTimeout)
            })

        return () => clearTimeout(loadingTimeout)
    }, [dispatchRef, tRef])

    // Show an error message if the bridge panics while running.
    useEffect(() => {
        const unsubscribe = fedimint.addListener('panic', ev => {
            setError(ev.message)
        })
        return () => unsubscribe()
    }, [])

    // Connect to chat of active federation after bridge initializes.
    // TODO: Move this logic into redux initiailization when PWA and app both use it.
    useEffect(() => {
        if (!federationId || !isInitialized || !authenticatedMember?.id) return
        dispatch(connectChat({ fedimint, federationId }))
        return () => {
            dispatch(disconnectChat({ federationId }))
        }
    }, [federationId, isInitialized, authenticatedMember?.id, dispatch])

    if (isInitialized && !error) {
        if (!activeFederation && !pathname.startsWith('/onboarding')) {
            return <Redirect path="/onboarding" />
        }
        return <>{children}</>
    }

    let message
    if (error) {
        message = error
    } else if (isShowingLoading) {
        message = 'Initializing federation bridge...'
    }

    return (
        <Loader>
            <FediLogo />
            {message && (
                <Message error={!!error}>
                    <Text>{message}</Text>
                </Message>
            )}
        </Loader>
    )
}

const loaderFadeIn = keyframes({
    '0%, 50%': { opacity: 0 },
    '100%': { opacity: 1 },
})

const Loader = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    width: 120,
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: `${loaderFadeIn} 400ms ease`,

    '& svg': {
        height: '100%',
        width: '100%',
    },
})

const messageFadeUp = keyframes({
    '0%': {
        transform: 'translateX(-50%) translateY(10px)',
        opacity: 0,
    },
    '100%': {
        transform: 'translateX(-50%) translateY(0)',
        opacity: 0.6,
    },
})

const Message = styled('div', {
    position: 'absolute',
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100vw',
    maxWidth: 300,
    textAlign: 'center',
    animation: `${messageFadeUp} 600ms ease 1 forwards`,

    variants: {
        error: {
            true: {
                color: theme.colors.red,
            },
        },
    },
})
