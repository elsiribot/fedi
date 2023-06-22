import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import EditIcon from '@fedi/common/assets/svgs/edit.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import {
    configureChatGroup,
    selectActiveFederation,
    selectChatGroup,
    selectChatGroupRole,
    selectChatMessages,
    sendGroupMessage,
} from '@fedi/common/redux'
import { ChatRole, ChatType } from '@fedi/common/types'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled } from '../styles'
import { ChatConversation } from './ChatConversation'
import { ChatEmptyState } from './ChatEmptyState'
import { CopyInput } from './CopyInput'
import { Dialog } from './Dialog'
import { IconButton } from './IconButton'
import { QRCode } from './QRCode'

interface Props {
    groupId: string
}

export const ChatGroupConversation: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { showErrorToast } = useToast()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const messages = useAppSelector(s => selectChatMessages(s, groupId))
    const role = useAppSelector(s => selectChatGroupRole(s, groupId))
    const [isDialogOpen, setIsDialogOpen] = useState(false)

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
                        {role === ChatRole.moderator && (
                            <IconButton
                                size="md"
                                icon={EditIcon}
                                onClick={handleEditGroupName}
                            />
                        )}
                        <IconButton
                            size="md"
                            icon={QRIcon}
                            onClick={() => setIsDialogOpen(true)}
                        />
                        <Dialog
                            open={isDialogOpen}
                            onOpenChange={setIsDialogOpen}
                            title={t('feature.chat.invite-to-group')}>
                            <QRWrapper>
                                <QRCode data={link} />
                            </QRWrapper>
                            <CopyInput
                                value={link}
                                onCopyMessage={t(
                                    'feature.chat.copied-group-invite-code',
                                )}
                            />
                        </Dialog>
                    </>
                )
            }
        />
    )
}

const QRWrapper = styled('div', {
    maxWidth: 300,
    margin: '0 auto 24px',
})
