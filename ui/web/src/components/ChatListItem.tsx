import Link from 'next/link'
import { useRouter } from 'next/router'
import React from 'react'
import { useTranslation } from 'react-i18next'

import SocialPeopleIcon from '@fedi/common/assets/svgs/social-people.svg'
import { selectAuthenticatedMember } from '@fedi/common/redux'
import { ChatType, ChatWithLatestMessage } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'
import { makePaymentText } from '@fedi/common/utils/chat'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Avatar } from './Avatar'
import { NotificationDot } from './NotificationDot'
import { Text } from './Text'

interface Props {
    chat: ChatWithLatestMessage
}

export const ChatListItem: React.FC<Props> = ({ chat }) => {
    const { t } = useTranslation()
    const { query } = useRouter()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
    const isActive = chat.id === query?.path?.[1]
    const { latestMessage, hasNewMessages } = chat

    let previewMessage = latestMessage?.content
    if (latestMessage?.payment) {
        previewMessage = makePaymentText(
            t,
            latestMessage.sentBy.split('@')[0],
            latestMessage.sentTo?.split('@')[0] || '',
            authenticatedMember?.username || '',
            latestMessage.payment.recipient?.split('@')[0],
            latestMessage.payment.amount,
            latestMessage.payment.memo,
        )
    }

    return (
        <Container
            key={chat.id}
            active={isActive}
            href={
                chat.type === ChatType.group
                    ? `/chat/group/${chat.id}`
                    : `/chat/member/${chat.id}`
            }>
            <NotificationDot visible={hasNewMessages}>
                <Avatar
                    id={chat.id}
                    name={chat.name}
                    icon={
                        chat.type === ChatType.group
                            ? SocialPeopleIcon
                            : undefined
                    }
                    css={{ flexShrink: 0 }}
                />
            </NotificationDot>
            <Content>
                <TopContent>
                    <Text
                        weight="bold"
                        ellipsize
                        css={{ flex: 1, minWidth: 0 }}>
                        {chat.name}
                    </Text>
                    {latestMessage?.sentAt && (
                        <Text variant="small" css={{ flexShrink: 0 }}>
                            {dateUtils.formatChatTileTimestamp(
                                latestMessage?.sentAt,
                            )}
                        </Text>
                    )}
                </TopContent>
                <Text
                    variant="small"
                    ellipsize
                    weight={hasNewMessages ? 'bold' : 'normal'}
                    css={{
                        color: hasNewMessages
                            ? theme.colors.primary
                            : theme.colors.darkGrey,
                    }}>
                    {previewMessage}
                </Text>
            </Content>
        </Container>
    )
}

const Container = styled(Link, {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,

    '&:hover, &:focus': {
        background: theme.colors.primary05,
    },

    variants: {
        active: {
            true: {
                background: theme.colors.primary05,
            },
        },
    },
})

const Content = styled('div', {
    flex: 1,
    minWidth: 0,
})

const TopContent = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
})
