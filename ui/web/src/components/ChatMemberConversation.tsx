import React, { useCallback, useEffect, useState } from 'react'

import WalletIcon from '@fedi/common/assets/svgs/wallet.svg'
import {
    fetchChatMember,
    selectActiveFederation,
    selectChatClientStatus,
    selectChatMember,
    selectChatMessages,
    sendDirectMessage,
} from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled } from '../styles'
import { ChatConversation } from './ChatConversation'
import { ChatEmptyState } from './ChatEmptyState'
import { ChatPaymentDialog } from './ChatPaymentDialog'
import { HoloLoader } from './HoloLoader'
import { IconButton } from './IconButton'

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
    const [isPaymentOpen, setIsPaymentOpen] = useState(false)

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
        <>
            <ChatConversation
                type={ChatType.direct}
                id={member?.id || ''}
                name={member?.username || ''}
                messages={messages}
                onSendMessage={handleSend}
                inputActions={
                    <IconButton
                        size="md"
                        icon={WalletIcon}
                        onClick={() => setIsPaymentOpen(true)}
                    />
                }
            />
            <ChatPaymentDialog
                recipientId={memberId}
                open={isPaymentOpen}
                onOpenChange={setIsPaymentOpen}
            />
        </>
    )
}

const LoadingContainer = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
})
