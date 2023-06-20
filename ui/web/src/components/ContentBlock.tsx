import React from 'react'

import { styled, theme } from '../styles'

interface Props {
    maxWidth?: number
    padding?: number
    children: React.ReactNode
}

export const ContentBlock: React.FC<Props> = ({
    children,
    maxWidth = 600,
    padding,
}) => {
    return <Container css={{ maxWidth, padding }}>{children}</Container>
}

const Container = styled('div', {
    width: '100%',
    padding: '64px 72px',
    background: theme.colors.white,
    borderRadius: 20,
    boxShadow:
        '0px 7px 11px rgba(1, 153, 176, 0.06), 0px 16px 40px rgba(112, 153, 176, 0.16)',

    '@md': {
        padding: 48,
    },

    '@sm': {
        height: '100%',
        padding: 0,
        borderRadius: 0,
        boxShadow: 'none',
        maxWidth: 'none',
        animation: 'none',
    },
})
