import React from 'react'

import { styled } from '../../styles'
import { FederationSelector } from './FederationSelector'
import { Navigation } from './Navigation'

interface Props {
    children: React.ReactNode
}

export const Template: React.FC<Props> = ({ children }) => {
    return (
        <Container>
            <Navigation />
            <Content>
                <FederationSelector />
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
})

const Content = styled('main', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 48,
    padding: 48,
    overflow: 'auto',
    holoGradient: '100',

    '@md': {
        padding: 36,
        gap: 36,
    },

    '@sm': {
        background: 'none',
    },
})
