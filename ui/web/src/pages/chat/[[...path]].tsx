import { useRouter } from 'next/router'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import {
    connectChat,
    disconnectChat,
    selectActiveFederation,
} from '@fedi/common/redux'

import { ChatBlock } from '../../components/ChatBlock'
import { ChatGroupConversation } from '../../components/ChatGroupConversation'
import { ChatMemberConversation } from '../../components/ChatMemberConversation'
import { ChatNew } from '../../components/ChatNew'
import { Redirect } from '../../components/Redirect'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { fedimint } from '../../lib/bridge'
import { styled, theme } from '../../styles'

function ChatPage() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const { query, isReady } = useRouter()

    const [chatType, chatId] = Array.isArray(query.path)
        ? [query.path[0], query.path[1]]
        : []

    // Connect to chat on this page.
    useEffect(() => {
        if (!federationId) return
        console.log('connec')
        dispatch(connectChat({ fedimint, federationId }))

        return () => {
            dispatch(disconnectChat({ federationId }))
        }
    }, [federationId, dispatch])

    if (!isReady) return null

    let content: React.ReactNode
    let isShowingContent = true
    if (chatType === 'new') {
        content = <ChatNew />
    } else if (chatType === 'member' && chatId) {
        content = <ChatMemberConversation memberId={chatId} />
    } else if (chatType === 'group' && chatId) {
        content = <ChatGroupConversation groupId={chatId} />
    } else if (!chatType) {
        isShowingContent = false
        content = (
            <EmptyMessage>Select a chat, or start a new chat</EmptyMessage>
        )
    } else {
        return <Redirect path="/chat" />
    }

    return <ChatBlock isShowingContent={isShowingContent}>{content}</ChatBlock>
}

const EmptyMessage = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    padding: 24,
    color: theme.colors.darkGrey,
})

export default ChatPage
