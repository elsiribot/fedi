import Link from 'next/link'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ChevronRightIcon from '@fedi/common/assets/svgs/chevron-right.svg'
import PlusIcon from '@fedi/common/assets/svgs/plus.svg'
import {
    selectActiveFederation,
    selectFederations,
    setActiveFederationId,
} from '@fedi/common/redux'
import { Federation } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { Avatar } from '../Avatar'
import { Icon } from '../Icon'
import { Popover } from '../Popover'
import { Text } from '../Text'

export const FederationSelector: React.FC = () => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const activeFederation = useAppSelector(selectActiveFederation)
    const federations = useAppSelector(selectFederations)
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)

    const handleSelectFederation = useCallback(
        (fed: Federation) => {
            dispatch(setActiveFederationId(fed.id))
            setIsSelectorOpen(false)
        },
        [dispatch],
    )

    if (!activeFederation) return null

    const federationList = (
        <FederationList>
            {federations.map(fed => (
                <li key={fed.id}>
                    <FederationItem
                        active={fed.id === activeFederation.id}
                        onClick={() => handleSelectFederation(fed)}>
                        <Avatar size="sm" shape="hexagon" name={fed.name} />
                        <div>
                            <Text variant="caption" weight="bold">
                                {fed.name}
                            </Text>
                            <Text variant="small">
                                {amountUtils.formatSats(
                                    amountUtils.msatToSat(fed.balance),
                                )}{' '}
                                {t('words.sats')}
                            </Text>
                        </div>
                    </FederationItem>
                </li>
            ))}
            <li>
                <FederationItem add as={Link} href="/onboarding/join">
                    <Icon icon={PlusIcon} size="sm" />
                    <Text variant="caption" weight="bold">
                        {t('feature.federations.add-federation')}
                    </Text>
                </FederationItem>
            </li>
        </FederationList>
    )

    return (
        <Container>
            <Popover
                content={federationList}
                sideOffset={10}
                open={isSelectorOpen}
                onOpenChange={setIsSelectorOpen}>
                <ActiveFederation>
                    <Avatar
                        size="sm"
                        shape="hexagon"
                        name={activeFederation.name}
                    />
                    <Text variant="caption" weight="bold">
                        {activeFederation.name}
                    </Text>
                    <IconWrapper isOpen={isSelectorOpen}>
                        <Icon size="xs" icon={ChevronRightIcon} />
                    </IconWrapper>
                </ActiveFederation>
            </Popover>
        </Container>
    )
}

const Container = styled('div', {})

const ActiveFederation = styled('div', {
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

const FederationList = styled('ul', {
    width: 260,
    padding: 0,
    margin: -8,

    '& > li': {
        listStyle: 'none',
    },
})

const FederationItem = styled('button', {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    width: '100%',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: `transparent`,
    transition: 'background-color 100ms ease',

    '&:hover': {
        backgroundColor: theme.colors.primary10,
    },

    variants: {
        active: {
            true: {},
        },
        add: {
            true: {
                opacity: 0.6,

                '&:hover': {
                    opacity: 1,
                },
            },
        },
    },
})
