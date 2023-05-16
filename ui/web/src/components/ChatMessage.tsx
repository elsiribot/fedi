import React from 'react'

import type { ChatMessage as ChatMessageType } from '@fedi/common/types'

import { styled, theme } from '../styles'

interface Props {
    message: ChatMessageType
    isMe: boolean
}

export const ChatMessage: React.FC<Props> = ({ message, isMe }) => {
    const { payment } = message
    let content: React.ReactNode = message.content
    if (payment?.status !== undefined) {
        return (
            <MessageContent isPayment>
                Chat payments are not yet supported on the web.
            </MessageContent>
        )
    }

    return <MessageContent isMe={isMe}>{content}</MessageContent>
}

const MessageContent = styled('div', {
    width: 'fit-content',
    maxWidth: 480,
    padding: 8,
    fontSize: theme.fontSizes.caption,
    fontWeight: theme.fontWeights.medium,
    lineHeight: '20px',
    borderRadius: 12,

    variants: {
        isMe: {
            true: {
                background: theme.colors.blue,
                color: theme.colors.white,
            },
            false: {
                background: theme.colors.extraLightGrey,
                color: theme.colors.primary,
            },
        },
        isPayment: {
            true: {
                background: theme.colors.orange,
                color: theme.colors.white,
                fontStyle: 'italic',
            },
        },
    },
})
