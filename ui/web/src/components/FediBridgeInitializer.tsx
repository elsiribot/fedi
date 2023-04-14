import { useRouter } from 'next/router'
import React, { useEffect, useState } from 'react'

import FediLogo from '@fedi/common/assets/svgs/fedi-logo.svg'
import { refreshFederations, selectActiveFederation } from '@fedi/common/redux'

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
    const { isReady, pathname } = useRouter()
    const activeFederation = useAppSelector(selectActiveFederation)
    const [isInitialized, setIsInitialized] = useState(false)
    const [isShowingLoading, setIsShowingLoading] = useState(false)
    const [error, setError] = useState<string>()

    useEffect(() => {
        const loadingTimeout = setTimeout(() => {
            setIsShowingLoading(true)
        }, 1000)

        initializeBridge()
            .then(() => dispatch(refreshFederations(fedimint)).unwrap())
            .then(() => setIsInitialized(true))
            .catch(err => setError(err?.message || err?.toString()))
            .finally(() => {
                setIsShowingLoading(false)
                clearTimeout(loadingTimeout)
            })

        return () => clearTimeout(loadingTimeout)
    }, [dispatch])

    if (isInitialized) {
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
                <Message>
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
})
