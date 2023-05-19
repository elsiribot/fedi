import React from 'react'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import type { ChatMessage as ChatMessageType } from '@fedi/common/types'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { ChatMessagePayment } from './ChatMessagePayment'

interface Props {
    message: ChatMessageType
}

export const ChatMessage: React.FC<Props> = ({ message }) => {
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    const { payment } = message
    const isMe = message.sentBy === authenticatedMember?.id

    let content: React.ReactNode = message.content
    let isPayment = false
    if (payment?.status !== undefined) {
        isPayment = true
        content = <ChatMessagePayment message={message} payment={payment} />
    }

    return (
        <MessageContent isMe={isMe} isPayment={isPayment}>
            {content}
        </MessageContent>
    )
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
            true: {},
        },
    },
    compoundVariants: [
        // Fix a bug where isPayment sometimes doesn't override
        {
            isMe: true,
            isPayment: true,
            css: {
                background: theme.colors.orange,
                color: theme.colors.white,
            },
        },
        {
            isMe: false,
            isPayment: true,
            css: {
                background: theme.colors.orange,
                color: theme.colors.white,
            },
        },
    ],
})
