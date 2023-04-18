import { useRouter } from 'next/router'
import React from 'react'

import { keyframes, styled, theme } from '../../styles'
import { FederationSelector } from './FederationSelector'
import { Navigation } from './Navigation'

interface Props {
    children: React.ReactNode
}

export const Template: React.FC<Props> = ({ children }) => {
    const router = useRouter()
    const hideNavigation = router.pathname.startsWith('/onboarding')

    return (
        <Container>
            {!hideNavigation && <Navigation />}
            <Content centered={hideNavigation}>
                {!hideNavigation && <FederationSelector />}
                {children}
            </Content>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    minHeight: '-webkit-fill-available',

    '@md': {
        height: '-webkit-fill-available',
        maxHeight: '100vh',
        flexDirection: 'column-reverse',
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
    },
})
