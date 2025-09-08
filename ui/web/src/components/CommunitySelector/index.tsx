import { useRouter } from 'next/router'
import React, { useState } from 'react'

import ChevronDownIcon from '@fedi/common/assets/svgs/chevron-down.svg'
import {
    selectLastSelectedCommunity,
    selectCommunities,
} from '@fedi/common/redux'

import { onboardingRoute } from '../../constants/routes'
import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import CommunitiesOverlay from '../CommunitiesOverlay'
import { FederationAvatar } from '../FederationAvatar'
import { Icon } from '../Icon'

type Props = {
    onClick?(): void
}

export const CommunitySelector: React.FC<Props> = ({ onClick }) => {
    const { push } = useRouter()
    const selectedCommunity = useAppSelector(selectLastSelectedCommunity)
    const communities = useAppSelector(selectCommunities)
    const [showCommunities, setShowCommunities] = useState(false)

    const handleClick = () => {
        if (communities.length === 0) {
            push(onboardingRoute)
        } else {
            setShowCommunities(true)
            onClick?.()
        }
    }

    return (
        <>
            <Container onClick={handleClick}>
                <Wrapper>
                    {selectedCommunity && (
                        <FederationAvatar
                            federation={selectedCommunity}
                            size="xs"
                        />
                    )}
                    <Icon icon={ChevronDownIcon} size="sm" />
                </Wrapper>
            </Container>
            <CommunitiesOverlay
                open={showCommunities}
                onOpenChange={setShowCommunities}
            />
        </>
    )
}

const Container = styled('div', {
    boxSizing: 'border-box',
    borderRadius: 9999,
    cursor: 'pointer',
    holoGradient: '600',
    padding: 2,
    overflow: 'none',
})

const Wrapper = styled('div', {
    alignItems: 'center',
    background: theme.colors.white,
    borderRadius: 9999,
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    padding: '5px 12px',
    '& > button': {
        display: 'block',
    },
})
