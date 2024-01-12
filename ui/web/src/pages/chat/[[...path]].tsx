import { useRouter } from 'next/router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdateLastMessageSeen } from '@fedi/common/hooks/chat'

import { ChatBlock } from '../../components/ChatBlock'
import { ChatGroupConversation } from '../../components/ChatGroupConversation'
import { ChatMemberConversation } from '../../components/ChatMemberConversation'
import { ChatNew } from '../../components/ChatNew'
import { ChatOfflineIndicator } from '../../components/ChatOfflineIndicator'
import { Redirect } from '../../components/Redirect'
import { Text } from '../../components/Text'
import { useIsOnline } from '../../hooks'
import { styled, theme } from '../../styles'

function ChatPage() {
    const { t } = useTranslation()
    const { query, isReady } = useRouter()

    const isOnline = useIsOnline()

    const [chatType, chatId] = Array.isArray(query.path)
        ? [query.path[0], query.path[1]]
        : []

    // While we have the page open, immediately mark the latest message as seen.
    useUpdateLastMessageSeen()

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
            <Empty>
                {!isOnline ? (
                    <OfflineIndicatorContainer>
                        <ChatOfflineIndicator />
                    </OfflineIndicatorContainer>
                ) : null}
                <Message>{t('feature.chat.select-or-start')}</Message>
            </Empty>
        )
    } else {
        return <Redirect path="/chat" />
    }

    return <ChatBlock isShowingContent={isShowingContent}>{content}</ChatBlock>
}

const Empty = styled('div', {
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    height: '100%',
    padding: 24,
    color: theme.colors.darkGrey,
})

const Message = styled(Text, {
    color: theme.colors.darkGrey,
})

const OfflineIndicatorContainer = styled('div', {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    padding: '$lg',
    display: 'flex',
    justifyContent: 'flex-end',
})

export default ChatPage
