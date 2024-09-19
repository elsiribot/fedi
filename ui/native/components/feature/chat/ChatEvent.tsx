import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectMatrixAuth } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { isPaymentEvent, isTextEvent } from '@fedi/common/utils/matrix'

import { useAppSelector } from '../../../state/hooks'
import ChatFileEvent from './ChatFileEvent'
import ChatImageEvent from './ChatImageEvent'
import ChatPaymentEvent from './ChatPaymentEvent'
import ChatTextEvent from './ChatTextEvent'
import ChatVideoEvent from './ChatVideoEvent'
import { MessageItemError } from './MessageItemError'

type Props = {
    event: MatrixEvent
    last?: boolean
}

const ChatEvent: React.FC<Props> = ({ event, last = false }: Props) => {
    const { theme } = useTheme()
    const matrixAuth = useAppSelector(selectMatrixAuth)

    const isMe = event.senderId === matrixAuth?.userId
    const isQueued = false
    const isPayment = isPaymentEvent(event)
    const isText = isTextEvent(event)

    const bubbleContainerStyles: StyleProp<ViewStyle | TextStyle>[] = [
        styles(theme).bubbleContainer,
    ]

    // Set alignment (left/right) based on sender
    if (isMe) {
        bubbleContainerStyles.push(styles(theme).rightAlignedMessage)
    } else {
        bubbleContainerStyles.push(styles(theme).leftAlignedMessage)
    }

    if (last && isText) {
        bubbleContainerStyles.push(
            isMe
                ? styles(theme).lastSentMessage
                : styles(theme).lastReceivedMessage,
        )
    }

    return (
        <ErrorBoundary fallback={() => <MessageItemError />}>
            <View
                style={[
                    styles(theme).container,
                    isQueued && styles(theme).containerQueued,
                ]}>
                <View style={styles(theme).messageContainer}>
                    <View style={styles(theme).contentContainer}>
                        <View style={bubbleContainerStyles}>
                            {isPayment ? (
                                <ChatPaymentEvent event={event} />
                            ) : isText ? (
                                <ChatTextEvent event={event} />
                            ) : event.content.msgtype === 'm.image' ? (
                                <ChatImageEvent content={event.content} />
                            ) : event.content.msgtype === 'm.file' ? (
                                <ChatFileEvent content={event.content} />
                            ) : event.content.msgtype === 'm.video' ? (
                                <ChatVideoEvent content={event.content} />
                            ) : null}
                        </View>
                    </View>
                </View>
            </View>
        </ErrorBoundary>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.xxs,
        },
        containerQueued: {
            opacity: 0.5,
        },
        bubbleContainer: {
            borderRadius: 16,
            maxWidth: theme.sizes.maxMessageWidth,
            overflow: 'hidden',
        },
        contentContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            width: '100%',
        },
        messageContainer: {
            flexDirection: 'row',
        },
        leftAlignedMessage: {
            marginRight: 'auto',
        },
        rightAlignedMessage: {
            marginLeft: 'auto',
        },
        lastReceivedMessage: {
            borderBottomLeftRadius: 4,
        },
        lastSentMessage: {
            borderBottomRightRadius: 4,
        },
    })

const areEqual = (prev: Props, curr: Props) => {
    if (
        isPaymentEvent(curr.event) &&
        // TODO: make better TS types to avoid this ick
        'status' in prev.event.content &&
        'status' in curr.event.content
    ) {
        return (
            prev.event.id === curr.event.id &&
            prev.event.content.status === curr.event.content.status
        )
    } else {
        return (
            prev.event.eventId === curr.event.eventId &&
            prev.event.content.body === curr.event.content.body
        )
    }
}

export const bubbleGradient = {
    colors: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
}

export default React.memo(ChatEvent, areEqual)
