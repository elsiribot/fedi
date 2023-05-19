import React, { useCallback, useEffect, useState } from 'react'

import {
    fetchChatMember,
    selectActiveFederation,
    selectChatClientStatus,
    selectChatMember,
    selectChatMessages,
    selectChatXmppClient,
    sendDirectMessage,
} from '@fedi/common/redux'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled } from '../styles'
import { ChatConversation } from './ChatConversation'
import { ChatEmptyState } from './ChatEmptyState'
import { HoloLoader } from './HoloLoader'

interface Props {
    memberId: string
}

export const ChatMemberConversation: React.FC<Props> = ({ memberId }) => {
    const dispatch = useAppDispatch()
    const { showErrorToast } = useToast()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const member = useAppSelector(s => selectChatMember(s, memberId))
    const messages = useAppSelector(s => selectChatMessages(s, memberId))
    const isChatOnline = useAppSelector(selectChatClientStatus) === 'online'
    const [isLoading, setIsLoading] = useState(!member)

    // If we don't have info about this member, attempt to fetch a pubkey for them
    useEffect(() => {
        if (member || !federationId || !isChatOnline) return
        setIsLoading(true)
        dispatch(fetchChatMember({ federationId, memberId }))
            .catch(() => {
                /* no-op */
            })
            .finally(() => setIsLoading(false))
    }, [member, memberId, federationId, isChatOnline, dispatch])

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

    if (isLoading) {
        return (
            <LoadingContainer>
                <HoloLoader size="xl" />
            </LoadingContainer>
        )
    } else if (!member) {
        return (
            <ChatEmptyState>
                Could not find a member with the username &lsquo;
                {memberId.split('@')[0]}&rsquo;
            </ChatEmptyState>
        )
    }

    return (
        <ChatConversation
            name={member?.username || ''}
            messages={messages}
            onSendMessage={handleSend}
        />
    )
}

const LoadingContainer = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
})
