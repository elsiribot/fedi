import React, { useCallback, useState } from 'react'

import {
    selectActiveFederation,
    selectChatMember,
    selectChatMessages,
    sendDirectMessage,
} from '@fedi/common/redux'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { ChatConversation } from './ChatConversation'

interface Props {
    memberId: string
}

export const ChatMemberConversation: React.FC<Props> = ({ memberId }) => {
    const dispatch = useAppDispatch()
    const { showErrorToast } = useToast()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const member = useAppSelector(s => selectChatMember(s, memberId))
    const messages = useAppSelector(s => selectChatMessages(s, memberId))

    const handleSend = useCallback(
        async (content: string) => {
            if (!federationId) return
            try {
                await dispatch(
                    sendDirectMessage({
                        fedimint,
                        federationId,
                        recipientId: memberId,
                        content,
                    }),
                ).unwrap()
            } catch (err) {
                showErrorToast(err, 'errors.chat-unavailable')
            }
        },
        [dispatch, federationId, memberId, showErrorToast],
    )

    return (
        <ChatConversation
            name={member?.username || ''}
            messages={messages}
            onSendMessage={handleSend}
        />
    )
}
