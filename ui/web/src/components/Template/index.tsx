import { useRouter } from 'next/router'
import React from 'react'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { usePopupFederationInfo } from '@fedi/common/hooks/federation'

import { useMediaQuery } from '../../hooks'
import { styled, theme, config } from '../../styles'
import { PageError } from '../PageError'
import { PopupFederationOver } from '../PopupFederationOver'
import { FederationSelector } from './FederationSelector'
import { Navigation } from './Navigation'
import { PopupFederationCountdown } from './PopupFederationCountdown'

interface Props {
    children: React.ReactNode
}

export const Template: React.FC<Props> = ({ children }) => {
    const router = useRouter()
    const isSm = useMediaQuery(config.media.sm)
    const popupInfo = usePopupFederationInfo()

    // TODO: Move these out of template and into some better configuration management
    const isFullWidthPage = router.pathname.startsWith('/chat')
    const isFullScreenPage =
        router.asPath.startsWith('/chat/group') ||
        router.asPath.startsWith('/chat/member')
    const hideControls =
        router.pathname.startsWith('/onboarding') || (isSm && isFullScreenPage)

    const isPopupOver = !!popupInfo && popupInfo.secondsLeft <= 0
    const hideSideNavigation = hideControls || isPopupOver

    return (
        <Container>
            {!hideSideNavigation && <Navigation />}
            <Content
                centered={hideControls}
                fullWidth={isFullWidthPage}
                fullScreen={isFullScreenPage}>
                {!hideControls && (
                    <FederationControls>
                        <FederationSelector />
                        <PopupFederationCountdown />
                    </FederationControls>
                )}
                <ErrorBoundary fallback={() => <PageError />}>
                    {isPopupOver ? <PopupFederationOver /> : children}
                </ErrorBoundary>
            </Content>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    minHeight: '100vh',
    '@supports (min-height: -webkit-fill-available)': {
        minHeight: '-webkit-fill-available',
    },

    '@md': {
        height: '100vh',
        maxHeight: '100vh',
        flexDirection: 'column-reverse',

        '@supports (height: -webkit-fill-available)': {
            height: '-webkit-fill-available',
        },
    },

    '@standalone': {
        borderTop: `1px solid ${theme.colors.keyboardGrey}`,
    },
})

const Content = styled('main', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 48,
    padding: 48,
    overflow: 'auto',

    '@md': {
        padding: 36,
        gap: 36,
    },

    '@sm': {
        background: theme.colors.white,
    },

    variants: {
        centered: {
            true: {
                justifyContent: 'center',
            },
        },
        fullWidth: {
            true: {
                '@sm': {
                    padding: '36px 0 0',
                },
            },
        },
        fullScreen: {
            true: {
                '@sm': {
                    padding: 0,
                },
            },
        },
    },
})

const FederationControls = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
})
