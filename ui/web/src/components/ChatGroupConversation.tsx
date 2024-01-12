import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CogIcon from '@fedi/common/assets/svgs/cog.svg'
import Edit from '@fedi/common/assets/svgs/edit.svg'
import LeaveRoom from '@fedi/common/assets/svgs/leave-room.svg'
import Room from '@fedi/common/assets/svgs/room.svg'
import {
    configureChatGroup,
    leaveChatGroup,
    selectActiveFederationId,
    selectChat,
    selectChatGroup,
    selectChatGroupRole,
    selectChatMessages,
    sendGroupMessage,
} from '@fedi/common/redux'
import { ChatRole, ChatType } from '@fedi/common/types'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled, theme } from '../styles'
import { Button } from './Button'
import { ChatAvatar } from './ChatAvatar'
import { ChatConversation } from './ChatConversation'
import { ChatEmptyState } from './ChatEmptyState'
import { CopyInput } from './CopyInput'
import { Dialog } from './Dialog'
import { IconButton } from './IconButton'
import * as Layout from './Layout'
import { QRCode } from './QRCode'
import { Text } from './Text'

interface Props {
    groupId: string
}

export const ChatGroupConversation: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { showErrorToast } = useToast()
    const federationId = useAppSelector(selectActiveFederationId)
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const messages = useAppSelector(s => selectChatMessages(s, groupId))
    const role = useAppSelector(s => selectChatGroupRole(s, groupId))
    const [dialogState, setDialogState] = useState<
        'settings' | 'share' | false
    >(false)

    const chat = useAppSelector(s => selectChat(s, group?.id || ''))

    const handleSend = useCallback(
        async (content: string) => {
            if (!federationId) throw new Error('errors.unknown-error')
            // No need for try / catch, ChatConversation handles errors
            await dispatch(
                sendGroupMessage({
                    federationId,
                    groupId,
                    content,
                }),
            ).unwrap()
        },
        [dispatch, federationId, groupId],
    )

    const handleEditGroupName = useCallback(async () => {
        try {
            if (!federationId || !group) return
            const newName = prompt(t('feature.chat.change-group-name'))
            if (!newName) return
            await dispatch(
                configureChatGroup({
                    federationId,
                    groupId: group?.id,
                    groupName: newName,
                }),
            ).unwrap()
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
    }, [t, dispatch, showErrorToast, federationId, group])

    const handleLeaveGroup = useCallback(async () => {
        const shouldLeave = confirm(t('feature.chat.leave-group-confirmation'))
        if (!federationId || !group) return
        if (shouldLeave) {
            await dispatch(leaveChatGroup({ federationId, groupId: group?.id }))
            setDialogState(false)
        }
    }, [t, federationId, group, dispatch])

    if (!group) {
        return (
            <ChatEmptyState>{t('feature.chat.group-not-found')}</ChatEmptyState>
        )
    }

    const link = group ? encodeGroupInvitationLink(group.id) : ''
    return (
        <ChatConversation
            type={ChatType.group}
            id={group.id}
            name={group?.name || ''}
            messages={messages}
            onSendMessage={handleSend}
            headerActions={
                group && (
                    <>
                        <IconButton
                            size="md"
                            icon={CogIcon}
                            onClick={() => setDialogState('settings')}
                        />
                        <Dialog
                            open={dialogState === 'share'}
                            onOpenChange={(open: boolean) =>
                                setDialogState(open ? 'share' : false)
                            }
                            title={t('feature.chat.invite-to-group')}>
                            <Layout.Root>
                                <Layout.Content centered>
                                    <QRWrapper>
                                        <QRCode data={link} />
                                    </QRWrapper>
                                </Layout.Content>
                                <Layout.Actions>
                                    <CopyInput
                                        value={link}
                                        onCopyMessage={t(
                                            'feature.chat.copied-group-invite-code',
                                        )}
                                    />
                                </Layout.Actions>
                            </Layout.Root>
                        </Dialog>
                        <Dialog
                            open={dialogState === 'settings'}
                            onOpenChange={(open: boolean) =>
                                setDialogState(open ? 'settings' : false)
                            }>
                            <Layout.Root>
                                <Layout.Content centered>
                                    <SettingsWrapper>
                                        <GroupHeader>
                                            <ChatAvatar chat={chat} size="lg" />
                                            <Text variant="h2">
                                                {group.name}
                                            </Text>
                                        </GroupHeader>
                                        <ItemsWrapper>
                                            {role === ChatRole.moderator && (
                                                <Button
                                                    variant="outline"
                                                    icon={Edit}
                                                    onClick={
                                                        handleEditGroupName
                                                    }>
                                                    {t(
                                                        'feature.chat.edit-group',
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                icon={Room}
                                                onClick={() =>
                                                    setDialogState('share')
                                                }>
                                                {t(
                                                    'feature.chat.invite-to-group',
                                                )}
                                            </Button>
                                            <Button
                                                onClick={handleLeaveGroup}
                                                variant="outline"
                                                icon={LeaveRoom}>
                                                {t('feature.chat.leave-group')}
                                            </Button>
                                        </ItemsWrapper>
                                    </SettingsWrapper>
                                </Layout.Content>
                            </Layout.Root>
                        </Dialog>
                    </>
                )
            }
        />
    )
}

const QRWrapper = styled('div', {
    width: '100%',
    margin: '12px auto 0',
})

const ItemsWrapper = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.md,
})

const SettingsWrapper = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.xl,
})

const GroupHeader = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.lg,
    alignItems: 'center',
})
