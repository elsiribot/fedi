import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import EditIcon from '@fedi/common/assets/svgs/edit.svg'
import InviteMembersIcon from '@fedi/common/assets/svgs/invite-members.svg'
import LanguageIcon from '@fedi/common/assets/svgs/language.svg'
import LeaveFederationIcon from '@fedi/common/assets/svgs/leave-federation.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import ScrollIcon from '@fedi/common/assets/svgs/scroll.svg'
import TableExportIcon from '@fedi/common/assets/svgs/table-export.svg'
import UsdIcon from '@fedi/common/assets/svgs/usd.svg'
import WalletIcon from '@fedi/common/assets/svgs/wallet.svg'
import {
    useFederationSupportsSingleSeed,
    useIsInviteSupported,
} from '@fedi/common/hooks/federation'
import { useToast } from '@fedi/common/hooks/toast'
import { useExportTransactions } from '@fedi/common/hooks/transactions'
import {
    leaveFederation,
    selectActiveFederation,
    selectMatrixAuth,
    setMatrixDisplayName,
    uploadAndSetMatrixAvatarUrl,
} from '@fedi/common/redux'
import { getFederationTosUrl } from '@fedi/common/utils/FederationUtils'

import { Avatar } from '../../components/Avatar'
import { ChatUserQRDialog } from '../../components/ChatUserQRDialog'
import { CircularLoader } from '../../components/CircularLoader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ContentBlock } from '../../components/ContentBlock'
import { Icon } from '../../components/Icon'
import { IconButton } from '../../components/IconButton'
import { InviteMemberDialog } from '../../components/InviteMemberDialog'
import * as Layout from '../../components/Layout'
import { SettingsMenu, SettingsMenuProps } from '../../components/SettingsMenu'
import { Text } from '../../components/Text'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { fedimint, writeBridgeFile } from '../../lib/bridge'
import { styled, theme } from '../../styles'

function AdminPage() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const activeFederation = useAppSelector(selectActiveFederation)
    const toast = useToast()
    const exportTransactions = useExportTransactions(fedimint)
    const [isMemberQrOpen, setIsMemberQrOpen] = useState(false)
    const [isInvitingMember, setIsInvitingMember] = useState(false)
    const [isLeavingFederation, setIsLeavingFederation] = useState(false)
    const [isExportingCSV, setIsExportingCSV] = useState(false)
    const [isChangingName, setIsChangingName] = useState(false)
    const [isChangingAvatar, setIsChangingAvatar] = useState(false)
    const isInviteSupported = useIsInviteSupported()
    const supportsSingleSeed = useFederationSupportsSingleSeed()

    const federationId = activeFederation?.id
    const balance = activeFederation?.balance
    const canLeaveFederation = typeof balance === 'number' && balance < 100_000

    const handleAvatarChange = useCallback(
        async (ev: React.ChangeEvent<HTMLInputElement>) => {
            const file = ev.target.files?.[0]
            if (!file) return
            setIsChangingAvatar(true)
            try {
                const path = 'chat-avatar'
                const mimeType = file.type
                const data = new Uint8Array(await file.arrayBuffer())
                await writeBridgeFile(path, data)
                await dispatch(
                    uploadAndSetMatrixAvatarUrl({ fedimint, path, mimeType }),
                ).unwrap()
            } catch (err) {
                toast.error(t, 'errors.unknown-error')
            }
            setIsChangingAvatar(false)
        },
        [dispatch, t, toast],
    )

    const handleDisplayNameChange = useCallback(async () => {
        setIsChangingName(true)
        const displayName = prompt(t('feature.onboarding.enter-username'))
        if (!displayName) return
        try {
            await dispatch(setMatrixDisplayName({ displayName })).unwrap()
        } catch (err) {
            toast.error(t, 'errors.unknown-error')
        }
        setIsChangingName(false)
    }, [dispatch, t, toast])

    const handleConfirmLeaveFederation = useCallback(async () => {
        if (!federationId) return
        if (canLeaveFederation) {
            try {
                await dispatch(leaveFederation({ fedimint, federationId }))
            } catch (err) {
                toast.error(t, err, 'errors.unknown-error')
                return
            }
        }
        setIsLeavingFederation(false)
    }, [canLeaveFederation, federationId, dispatch, toast, t])

    const tosUrl =
        (activeFederation && getFederationTosUrl(activeFederation.meta)) ||
        undefined

    const exportTransactionsAsCsv = async () => {
        setIsExportingCSV(true)

        const res = await exportTransactions()

        if (res.success) {
            const element = document.createElement('a')
            element.setAttribute('href', res.uri)
            element.setAttribute('download', res.fileName)

            document.body.appendChild(element)
            element.click()
            document.body.removeChild(element)
        } else {
            toast.error(t, res.message, 'errors.unknown-error')
        }

        setIsExportingCSV(false)
    }

    let menu: SettingsMenuProps['menu'] = [
        {
            label: t('words.federation'),
            items: [
                {
                    label: t('feature.federations.federation-terms'),
                    icon: ScrollIcon,
                    href: tosUrl,
                    disabled: !tosUrl,
                },
                {
                    label: t('feature.federations.invite-members'),
                    icon: InviteMembersIcon,
                    onClick: () => setIsInvitingMember(true),
                    disabled: !isInviteSupported,
                },
                {
                    label: t('feature.federations.leave-federation'),
                    icon: LeaveFederationIcon,
                    onClick: () => setIsLeavingFederation(true),
                },
            ],
        },
        {
            label: 'words.wallet',
            items: [
                {
                    label: t('feature.backup.backup-wallet'),
                    icon: WalletIcon,
                    href: '/settings/backup',
                    hidden: !supportsSingleSeed,
                },
                {
                    label: t('feature.backup.export-transactions-to-csv'),
                    icon: TableExportIcon,
                    onClick: exportTransactionsAsCsv,
                    disabled: isExportingCSV,
                },
            ],
        },
        {
            label: t('words.general'),
            items: [
                {
                    label: t('words.language'),
                    icon: LanguageIcon,
                    href: '/settings/language',
                },
                {
                    label: t('phrases.display-currency'),
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
                    {!!matrixAuth && (
                        <IconButton
                            icon={QRIcon}
                            size="md"
                            onClick={() => setIsMemberQrOpen(true)}
                        />
                    )}
                </Layout.Header>
                <Layout.Content>
                    <div>
                        {matrixAuth && (
                            <ChatIdentity>
                                <ChatAvatarContainer>
                                    <Avatar
                                        id={matrixAuth.userId}
                                        name={matrixAuth.displayName}
                                        src={matrixAuth.avatarUrl || ''}
                                        size="lg"
                                    />
                                    <AvatarEdit isUploading={isChangingAvatar}>
                                        <AvatarEditFileInput
                                            type="file"
                                            onChange={handleAvatarChange}
                                            accept="image/*, video/*"
                                            id="file-input"
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            multiple
                                        />
                                        {isChangingAvatar ? (
                                            <CircularLoader size="sm" />
                                        ) : (
                                            <Icon icon={EditIcon} size="md" />
                                        )}
                                    </AvatarEdit>
                                </ChatAvatarContainer>
                                <ChatIdentityName>
                                    <Text variant="h2" weight="medium">
                                        {matrixAuth.displayName}
                                    </Text>
                                    {isChangingName ? (
                                        <EditNameLoading>
                                            <CircularLoader size="xs" />
                                        </EditNameLoading>
                                    ) : (
                                        <IconButton
                                            icon={EditIcon}
                                            size="md"
                                            onClick={handleDisplayNameChange}
                                        />
                                    )}
                                </ChatIdentityName>
                            </ChatIdentity>
                        )}
                        <SettingsMenu menu={menu} />
                    </div>
                </Layout.Content>
            </Layout.Root>

            <ChatUserQRDialog
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

const ChatIdentity = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: '24px 16px',
    borderRadius: 16,
    holoGradient: '400',
})

const ChatAvatarContainer = styled('div', {
    display: 'flex',
    position: 'relative',
})

const AvatarEdit = styled('label', {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: '100%',
    opacity: 0,
    cursor: 'pointer',
    color: theme.colors.white,
    background: theme.colors.primary20,
    filter: `drop-shadow(1px 1px 2px ${theme.colors.primary20})`,
    transition: `opacity 100ms ease`,

    '&:hover': {
        opacity: 1,
    },
    variants: {
        isUploading: {
            true: {
                opacity: 1,
                pointerEvents: 'none',
            },
        },
    },
})

const AvatarEditFileInput = styled('input', {
    opacity: 0,
    position: 'absolute',
    zIndex: -1,
    top: 0,
    left: 0,
    width: 1,
    height: 1,
})

const ChatIdentityName = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
})

const EditNameLoading = styled('div', {
    width: 32,
})

export default AdminPage
