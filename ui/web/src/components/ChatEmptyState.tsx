import React from 'react'

import { styled, theme } from '../styles'

interface Props {
    children: React.ReactNode
}

export const ChatEmptyState: React.FC<Props> = ({ children }) => {
    return <Container>{children}</Container>
}

const Container = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    color: theme.colors.darkGrey,
})
