import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import CogIcon from '@fedi/common/assets/svgs/cog.svg'
import LeaveRoom from '@fedi/common/assets/svgs/leave-room.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import {
    configureChatGroup,
    leaveChatGroup,
    selectActiveFederationId,
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
import { ChatConversation } from './ChatConversation'
import { ChatEmptyState } from './ChatEmptyState'
import { CopyInput } from './CopyInput'
import { Dialog } from './Dialog'
import { IconButton } from './IconButton'
import { Input } from './Input'
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
    const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false)
    const [groupName, setGroupName] = useState(group?.name || '')

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
            if (!groupName) return
            await dispatch(
                configureChatGroup({
                    federationId,
                    groupId: group?.id,
                    groupName,
                }),
            ).unwrap()
            setIsSettingsDialogOpen(false)
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
    }, [dispatch, showErrorToast, federationId, group, groupName])

    const handleLeaveGroup = useCallback(async () => {
        const shouldLeave = confirm(t('feature.chat.leave-group-confirmation'))
        if (!federationId || !group) return
        if (shouldLeave) {
            await dispatch(leaveChatGroup({ federationId, groupId: group?.id }))
            setIsSettingsDialogOpen(false)
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
                            icon={QRIcon}
                            onClick={() => setIsShareDialogOpen(true)}
                        />
                        <IconButton
                            size="md"
                            icon={CogIcon}
                            onClick={() => setIsSettingsDialogOpen(true)}
                        />
                        <Dialog
                            open={isShareDialogOpen}
                            onOpenChange={setIsShareDialogOpen}
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
                            open={isSettingsDialogOpen}
                            onOpenChange={setIsSettingsDialogOpen}
                            title={group.name}>
                            <Layout.Root>
                                <Layout.Content centered>
                                    <SettingsContentWrapper>
                                        {role === ChatRole.moderator && (
                                            <RenameWrapper>
                                                <Input
                                                    value={groupName}
                                                    onChange={e =>
                                                        setGroupName(
                                                            e.target.value,
                                                        )
                                                    }
                                                    name="group-name"
                                                    placeholder={t(
                                                        'feature.chat.group-name',
                                                    )}
                                                    label={
                                                        <Text variant="caption">
                                                            {t(
                                                                'feature.chat.group-name',
                                                            )}
                                                        </Text>
                                                    }
                                                />
                                                <Button
                                                    onClick={
                                                        handleEditGroupName
                                                    }>
                                                    {t('words.save')}
                                                </Button>
                                            </RenameWrapper>
                                        )}
                                        <Button
                                            onClick={handleLeaveGroup}
                                            variant="outline"
                                            icon={LeaveRoom}>
                                            {t('feature.chat.leave-group')}
                                        </Button>
                                    </SettingsContentWrapper>
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

const RenameWrapper = styled('div', {
    display: 'flex',
    gap: theme.space.md,
    alignItems: 'end',
})

const SettingsContentWrapper = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.md,
})
