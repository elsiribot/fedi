import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import EditIcon from '@fedi/common/assets/svgs/edit.svg'
import QRIcon from '@fedi/common/assets/svgs/qr.svg'
import {
    configureChatGroup,
    selectActiveFederation,
    selectChatGroup,
    selectChatMessages,
    sendGroupMessage,
} from '@fedi/common/redux'
import { encodeGroupInvitationLink } from '@fedi/common/utils/xmpp'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { styled } from '../styles'
import { ChatConversation } from './ChatConversation'
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
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleSend = useCallback(
        async (content: string) => {
            if (!federationId) return
            try {
                await dispatch(
                    sendGroupMessage({
                        federationId,
                        groupId,
                        content,
                    }),
                ).unwrap()
            } catch (err) {
                showErrorToast(err, 'errors.chat-unavailable')
            }
        },
        [dispatch, federationId, groupId, showErrorToast],
    )

    const handleEditGroupName = useCallback(() => {
        try {
            if (!federationId || !group) return
            const newName = prompt('Change group name')
            if (!newName) return
            dispatch(
                configureChatGroup({
                    federationId,
                    groupId: group?.id,
                    groupName: newName,
                }),
            )
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
    }, [dispatch, showErrorToast, federationId, group])

    const link = group ? encodeGroupInvitationLink(group.id) : ''

    return (
        <ChatConversation
            name={group?.name || ''}
            messages={messages}
            onSendMessage={handleSend}
            showUsernames
            headerActions={
                group && (
                    <>
                        <IconButton
                            size="md"
                            icon={EditIcon}
                            onClick={handleEditGroupName}
                        />
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
