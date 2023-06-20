import React from 'react'

import { CSSProp, styled, theme } from '../styles'

interface Props {
    children: React.ReactNode
    css?: CSSProp
}

export const ContentBlock: React.FC<Props> = ({ children, css }) => {
    return <Container css={css}>{children}</Container>
}

export const ContentBlockHeader = styled('div')

export const ContentBlockBody = styled('div')

const Container = styled('div', {
    width: '100%',
    maxWidth: 600,
    padding: '64px 72px',
    background: theme.colors.white,
    borderRadius: 20,
    boxShadow:
        '0px 7px 11px rgba(1, 153, 176, 0.06), 0px 16px 40px rgba(112, 153, 176, 0.16)',
    overflow: 'hidden',

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
