import React from 'react'

import { selectMatrixAuth } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import {
    isImageEvent,
    isPaymentEvent,
    isVideoEvent,
} from '@fedi/common/utils/matrix'

import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { ChatImageEvent } from './ChatImageEvent'
import { ChatPaymentEvent } from './ChatPaymentEvent'
import { ChatVideoEvent } from './ChatVideoEvent'

interface Props {
    event: MatrixEvent
}

export const ChatEvent: React.FC<Props> = ({ event }) => {
    const matrixAuth = useAppSelector(selectMatrixAuth)

    const isMe = event.senderId === matrixAuth?.userId

    const content = isImageEvent(event) ? (
        <ChatImageEvent event={event} />
    ) : isVideoEvent(event) ? (
        <ChatVideoEvent event={event} />
    ) : isPaymentEvent(event) ? (
        <ChatPaymentEvent event={event} />
    ) : typeof event.content.body === 'string' ? (
        event.content.body.split(/\r?\n/).map((part, index, array) => (
            <React.Fragment key={index}>
                {part}
                {index !== array.length - 1 && <br />}
            </React.Fragment>
        ))
    ) : (
        event.content.body
    )

    return (
        <MessageContent
            isMe={isMe}
            isMedia={isImageEvent(event) || isVideoEvent(event)}
            isPayment={isPaymentEvent(event)}>
            {content}
        </MessageContent>
    )
}

const MessageContent = styled('div', {
    width: 'fit-content',
    maxWidth: '90%',
    padding: 8,
    fontSize: theme.fontSizes.caption,
    fontWeight: theme.fontWeights.medium,
    lineHeight: '20px',
    wordWrap: 'break-word',
    borderRadius: 12,
    transition: 'opacity 100ms ease',
    maxHeight: 340,
    color: theme.colors.white,
    background: theme.colors.blue,

    variants: {
        isPayment: {
            true: {},
        },
        isMe: {
            false: {
                background: theme.colors.extraLightGrey,
                color: theme.colors.primary,
            },
        },
        isMedia: {
            true: {
                padding: 0,
            },
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
