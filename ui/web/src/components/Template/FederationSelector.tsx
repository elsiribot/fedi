import React, { useCallback, useState } from 'react'

import ChevronRight from '@fedi/common/assets/svgs/chevron-right.svg'
import { selectActiveFederation } from '@fedi/common/redux'

import { useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'
import { Text } from '../Text'

export const FederationSelector: React.FC = () => {
    const activeFederation = useAppSelector(selectActiveFederation)
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)

    const toggleSelectorOpen = useCallback(() => {
        setIsSelectorOpen(isOpen => !isOpen)
    }, [])

    if (!activeFederation) return null

    return (
        <Container>
            <ActiveFederation onClick={toggleSelectorOpen}>
                <Avatar
                    size="sm"
                    shape="hexagon"
                    name={activeFederation.name}
                />
                <Text variant="caption" weight="bold">
                    {activeFederation.name}
                </Text>
                <IconWrapper isOpen={isSelectorOpen}>
                    <Icon size="xs" icon={ChevronRight} />
                </IconWrapper>
            </ActiveFederation>
        </Container>
    )
}

const Container = styled('div', {})

const ActiveFederation = styled('button', {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
})

const IconWrapper = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -4,
    transition: 'transform 100ms ease',

    variants: {
        isOpen: {
            true: {
                transform: 'rotate(90deg)',
            },
        },
    },
})
