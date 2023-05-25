import { useRouter } from 'next/router'
import React from 'react'

import { useMediaQuery } from '../../hooks'
import { keyframes, styled, theme, config } from '../../styles'
import { FederationSelector } from './FederationSelector'
import { Navigation } from './Navigation'

interface Props {
    children: React.ReactNode
}

export const Template: React.FC<Props> = ({ children }) => {
    const router = useRouter()
    const isSm = useMediaQuery(config.media.sm)

    // TODO: Move these out of template and into some better configuration management
    const isFullWidthPage = router.pathname.startsWith('/chat')
    const isFullScreenPage =
        router.asPath.startsWith('/chat/group') ||
        router.asPath.startsWith('/chat/member')
    const hideNavigation =
        router.pathname.startsWith('/onboarding') || (isSm && isFullScreenPage)

    return (
        <Container>
            {!hideNavigation && <Navigation />}
            <Content
                centered={hideNavigation}
                fullWidth={isFullWidthPage}
                fullScreen={isFullScreenPage}>
                {!hideNavigation && <FederationSelector />}
                {children}
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
