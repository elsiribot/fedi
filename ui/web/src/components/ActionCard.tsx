import React from 'react'

import { styled } from '../styles'
import { Icon, IconProps } from './Icon'
import { Text } from './Text'

interface Props {
    icon: IconProps['icon']
    title: React.ReactNode
    description: React.ReactNode
    action: React.ReactNode
}

export const ActionCard: React.FC<Props> = ({
    icon,
    title,
    description,
    action,
}) => {
    return (
        <Container>
            <Icon icon={icon} />
            <Text weight="medium">{title}</Text>
            <Description>
                <Text variant="caption">{description}</Text>
            </Description>
            <Action>{action}</Action>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
    width: '100%',
    padding: 24,
    holoGradient: '400',
    borderRadius: 12,
})

const Description = styled('div', {
    maxWidth: 300,
})

const Action = styled('div', {
    paddingTop: 8,
})
