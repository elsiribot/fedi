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
    const isOnboardingPage = router.pathname.startsWith('/onboarding')
    const isChatPage =
        router.asPath.startsWith('/chat/group') ||
        router.asPath.startsWith('/chat/member')
    const hideControls = isOnboardingPage || (isSm && isChatPage)

    const isPopupOver =
        !isOnboardingPage && !!popupInfo && popupInfo.secondsLeft <= 0
    const hideSideNavigation = hideControls || isPopupOver

    return (
        <Container>
            {!hideSideNavigation && <Navigation />}
            <Content>
                {!hideControls && (
                    <FederationControls>
                        <FederationSelector />
                        <PopupFederationCountdown />
                    </FederationControls>
                )}
                <Main centered={hideControls}>
                    <ErrorBoundary fallback={() => <PageError />}>
                        {isPopupOver ? <PopupFederationOver /> : children}
                    </ErrorBoundary>
                </Main>
            </Content>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    minHeight: '100vh',

    '@supports (height: 100dvh)': {
        minHeight: '100dvh',
    },

    '@supports (min-height: -webkit-fill-available)': {
        minHeight: '-webkit-fill-available',
    },

    '@md': {
        height: '100vh',
        maxHeight: '100vh',
        flexDirection: 'column-reverse',

        '@supports (height: 100dvh)': {
            height: '100dvh',
            maxHeight: '100dvh',
        },

        '@supports (height: -webkit-fill-available)': {
            height: '-webkit-fill-available',
        },
    },

    '@standalone': {
        borderTop: `1px solid ${theme.colors.extraLightGrey}`,

        '@sm': {
            borderTop: 'none',
        },
    },
})

const Content = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minHeight: 0,
    overflow: 'auto',
    '--template-padding': '48px',

    '@md': {
        '--template-padding': '36px',
    },

    '@sm': {
        overflow: 'visible',
        background: theme.colors.white,
        '--template-padding': '24px',
    },

    '@xs': {
        '--template-padding': '16px',
    },
})

const Main = styled('main', {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: `var(--template-padding)`,
    padding: '0 var(--template-padding) var(--template-padding)',

    '@sm': {
        padding: '0',
        minHeight: 0,
        background: theme.colors.white,
    },

    variants: {
        centered: {
            true: {
                paddingTop: 'var(--template-padding)',
                justifyContent: 'center',

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
    justifyContent: 'center',
    width: '100%',
    padding: 'var(--template-padding) 8px',
    gap: 4,

    '@sm': {
        padding: '16px 8px',
        borderBottom: `1px solid ${theme.colors.extraLightGrey}`,
    },
})
