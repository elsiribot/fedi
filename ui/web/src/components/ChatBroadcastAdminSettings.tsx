import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import Close from '@fedi/common/assets/svgs/close.svg'
import {
    fetchChatGroupMembersList,
    removeAdminFromChatGroup,
    selectActiveFederationId,
} from '@fedi/common/redux'
import { ChatMember } from '@fedi/common/types'
import { XmppMemberRole } from '@fedi/common/utils/XmlUtils'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { ChatGroupDialogState } from './ChatGroupConversation'
import { IconButton } from './IconButton'
import { Text } from './Text'

export default function ChatBroadcastAdminSettings({
    setDialogState,
    groupId,
}: {
    setDialogState: (state: ChatGroupDialogState) => void
    groupId: string
}) {
    const { t } = useTranslation()

    const toast = useToast()
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(selectActiveFederationId)

    const [admins, setAdmins] = useState<ChatMember[]>([])

    const refreshAdminList = useCallback(async () => {
        if (activeFederationId) {
            setAdmins(
                await dispatch(
                    fetchChatGroupMembersList({
                        federationId: activeFederationId,
                        groupId,
                        role: XmppMemberRole.participant,
                    }),
                ).unwrap(),
            )
        }
    }, [activeFederationId, dispatch, groupId])

    const confirmRemoveAdmin = async (member: ChatMember) => {
        try {
            if (activeFederationId) {
                await dispatch(
                    removeAdminFromChatGroup({
                        federationId: activeFederationId,
                        groupId,
                        memberId: member.id,
                    }),
                ).unwrap()
                refreshAdminList()
            }
        } catch (error) {
            toast?.showErrorToast(error, t('errors.unknown-error'))
        }
    }

    useEffect(() => {
        if (activeFederationId) {
            refreshAdminList()
        }
    }, [activeFederationId, refreshAdminList])

    return (
        <Container>
            <Text>{t('feature.chat.admin-settings-instructions')}</Text>

            {admins.length > 0 ? (
                <AdminsContainer>
                    {admins.map((admin, i) => (
                        <AdminUser key={i}>
                            <Avatar id={admin.id} name={admin.username} />
                            <AdminUsername>{admin.username}</AdminUsername>
                            <IconButton
                                size="md"
                                icon={Close}
                                onClick={() => confirmRemoveAdmin(admin)}
                            />
                        </AdminUser>
                    ))}
                </AdminsContainer>
            ) : (
                <EmptyContainer>
                    <Text>{t('feature.chat.no-admins')}</Text>
                </EmptyContainer>
            )}

            <Button onClick={() => setDialogState('add-broadcast-admin')}>
                {t('feature.chat.add-admin')}
            </Button>
        </Container>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.lg,
})

const AdminsContainer = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.sm,
})

const AdminUser = styled('div', {
    display: 'flex',
    gap: theme.space.sm,
    alignItems: 'center',
})

const AdminUsername = styled(Text, {
    flex: 1,
})

const EmptyContainer = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: theme.space.lg,
    paddingBottom: theme.space.lg,
    border: `1px solid ${theme.colors.extraLightGrey}`,
    borderRadius: 12,
    color: theme.colors.grey,
    alignItems: 'center',
})
