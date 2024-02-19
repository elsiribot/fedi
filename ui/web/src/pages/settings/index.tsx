import Link from 'next/link'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import ChevronRightIcon from '@fedi/common/assets/svgs/chevron-right.svg'
import InviteMembersIcon from '@fedi/common/assets/svgs/invite-members.svg'
import LanguageIcon from '@fedi/common/assets/svgs/language.svg'
import LeaveFederationIcon from '@fedi/common/assets/svgs/leave-federation.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import ScrollIcon from '@fedi/common/assets/svgs/scroll.svg'
import UsdIcon from '@fedi/common/assets/svgs/usd.svg'
import WalletIcon from '@fedi/common/assets/svgs/wallet.svg'
import {
    useFederationSupportsSingleSeed,
    useIsInviteSupported,
} from '@fedi/common/hooks/federation'
import {
    leaveFederation,
    selectActiveFederation,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import { getFederationTosUrl } from '@fedi/common/utils/FederationUtils'

import { Avatar } from '../../components/Avatar'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ContentBlock } from '../../components/ContentBlock'
import { Icon } from '../../components/Icon'
import { IconProps } from '../../components/Icon'
import { IconButton } from '../../components/IconButton'
import { InviteMemberDialog } from '../../components/InviteMemberDialog'
import * as Layout from '../../components/Layout'
import { MemberQRDialog } from '../../components/MemberQRDialog'
import { Text } from '../../components/Text'
import { useAppDispatch, useAppSelector, useToast } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled, theme } from '../../styles'

type Menu = Array<{
    name: string // TODO: Type as valid translation key?
    items: Array<{
        name: string // TODO: Type as valid translation key?
        icon: IconProps['icon']
        disabled?: boolean
        hidden?: boolean
        href?: string
        onClick?: () => void
    }>
}>

function AdminPage() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const member = useAppSelector(selectAuthenticatedMember)
    const activeFederation = useAppSelector(selectActiveFederation)
    const { showErrorToast } = useToast()
    const [isMemberQrOpen, setIsMemberQrOpen] = useState(false)
    const [isInvitingMember, setIsInvitingMember] = useState(false)
    const [isLeavingFederation, setIsLeavingFederation] = useState(false)
    const isInviteSupported = useIsInviteSupported()
    const supportsSingleSeed = useFederationSupportsSingleSeed()

    const federationId = activeFederation?.id
    const balance = activeFederation?.balance
    const canLeaveFederation = typeof balance === 'number' && balance < 100_000

    const handleConfirmLeaveFederation = useCallback(async () => {
        if (!federationId) return
        if (canLeaveFederation) {
            try {
                await dispatch(leaveFederation({ fedimint, federationId }))
            } catch (err) {
                showErrorToast(err, 'errors.unknown-error')
                return
            }
        }
        setIsLeavingFederation(false)
    }, [canLeaveFederation, federationId, dispatch, showErrorToast])

    const tosUrl =
        (activeFederation && getFederationTosUrl(activeFederation.meta)) ||
        undefined

    let menu: Menu = [
        {
            name: 'words.federation',
            items: [
                {
                    name: 'feature.federations.federation-terms',
                    icon: ScrollIcon,
                    href: tosUrl,
                    disabled: !tosUrl,
                },
                {
                    name: 'feature.federations.invite-members',
                    icon: InviteMembersIcon,
                    onClick: () => setIsInvitingMember(true),
                    disabled: !isInviteSupported,
                },
                {
                    name: 'feature.federations.leave-federation',
                    icon: LeaveFederationIcon,
                    onClick: () => setIsLeavingFederation(true),
                },
            ],
        },
        {
            name: 'words.backup',
            items: [
                {
                    name: 'feature.backup.backup-wallet',
                    icon: WalletIcon,
                    href: '/settings/backup',
                    hidden: !supportsSingleSeed,
                },
            ],
        },
        {
            name: 'words.general',
            items: [
                {
                    name: 'words.language',
                    icon: LanguageIcon,
                    href: '/settings/language',
                },
                {
                    name: 'phrases.display-currency',
                    icon: UsdIcon,
                    href: '/settings/currency',
                },
            ],
        },
    ]
    // Filter out hidden items, filter out groups that have no items left.
    menu = menu
        .map(group => ({
            ...group,
            items: group.items.filter(item => !item.hidden),
        }))
        .filter(group => group.items.length > 0)

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>{t('words.settings')}</Layout.Title>
                    {!!member && (
                        <IconButton
                            icon={QRIcon}
                            size="md"
                            onClick={() => setIsMemberQrOpen(true)}
                        />
                    )}
                </Layout.Header>
                <Layout.Content>
                    <div>
                        {member && (
                            <MemberDetails>
                                <Avatar
                                    id={member.id}
                                    name={member.username}
                                    size="lg"
                                />
                                <Text variant="h2" weight="medium">
                                    {member.username}
                                </Text>
                            </MemberDetails>
                        )}
                        <Menu>
                            {menu.map(group => (
                                <MenuGroup key={group.name}>
                                    <MenuGroupName>
                                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                        <Text>{t(group.name as any)}</Text>
                                    </MenuGroupName>
                                    <MenuGroupItems>
                                        {group.items.map(item => {
                                            const linkProps = item.href
                                                ? { as: Link, href: item.href }
                                                : undefined
                                            return (
                                                <MenuItem
                                                    {...linkProps}
                                                    key={item.name}
                                                    disabled={item.disabled}
                                                    onClick={
                                                        item.disabled
                                                            ? undefined
                                                            : item.onClick
                                                    }>
                                                    <>
                                                        <Icon
                                                            icon={item.icon}
                                                        />
                                                        <Text>
                                                            {t(
                                                                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                                                                item.name as any,
                                                            )}
                                                        </Text>
                                                        <Icon
                                                            icon={
                                                                ChevronRightIcon
                                                            }
                                                        />
                                                    </>
                                                </MenuItem>
                                            )
                                        })}
                                    </MenuGroupItems>
                                </MenuGroup>
                            ))}
                        </Menu>
                    </div>
                </Layout.Content>
            </Layout.Root>

            <MemberQRDialog
                open={isMemberQrOpen}
                onOpenChange={setIsMemberQrOpen}
            />

            <InviteMemberDialog
                open={isInvitingMember}
                onOpenChange={setIsInvitingMember}
            />

            <ConfirmDialog
                open={isLeavingFederation}
                title={t('feature.federations.leave-federation')}
                description={t(
                    canLeaveFederation
                        ? 'feature.federations.leave-federation-confirmation'
                        : 'feature.federations.leave-federation-withdraw-first',
                )}
                onClose={() => setIsLeavingFederation(false)}
                onConfirm={handleConfirmLeaveFederation}
            />
        </ContentBlock>
    )
}

const MemberDetails = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: '24px 16px',
    borderRadius: 16,
    holoGradient: '400',
})

const Menu = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 8,
})

const MenuGroup = styled('div', {})

const MenuGroupName = styled('div', {
    color: theme.colors.grey,
    padding: '8px 0',
})

const MenuGroupItems = styled('div', {
    margin: '0 -8px -8px',
})

const MenuItem = styled('button', {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 8,
    borderRadius: 8,
    textAlign: 'left',
    transition: 'background-color 100ms ease',

    '& > *:nth-child(0n+2)': {
        flex: 1,
    },

    '& > *:last-child': {
        opacity: 0.5,
        transition: 'transform 100ms ease, opacity 100ms ease',
    },

    '&:hover, &:focus': {
        background: theme.colors.primary05,

        '& > *:last-child': {
            opacity: 1,
            transform: 'translateX(2px)',
        },
    },

    variants: {
        disabled: {
            true: {
                cursor: 'not-allowed',
                color: theme.colors.grey,
                background: 'none',

                '& > *:last-child': {
                    opacity: 1,
                    transform: 'none',
                },
            },
        },
    },
})

export default AdminPage
