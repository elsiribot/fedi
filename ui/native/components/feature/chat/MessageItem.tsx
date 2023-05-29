import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Pressable,
    StyleProp,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'
import type { LinearGradientProps } from 'react-native-linear-gradient'

import { selectAuthenticatedMember } from '@fedi/common/redux'
import { jidToId } from '@fedi/common/utils/chat'

import { useAppSelector } from '../../../state/hooks'
import { Message } from '../../../types'
import Avatar from '../../ui/Avatar'
import { OptionalGradient } from '../../ui/OptionalGradient'
import MessageContents from './MessageContents'
import PaymentMessage from './PaymentMessage'

type MessageItemProps = {
    message: Message
    multiUserChat?: boolean
    last?: boolean
}

const MessageItem: React.FC<MessageItemProps> = ({
    message,
    multiUserChat = false,
    last = false,
}: MessageItemProps) => {
    const { theme } = useTheme()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    const { sentBy, payment } = message

    const sentByMe = sentBy?.username === authenticatedMember?.username

    let bubbleGradient: LinearGradientProps | undefined
    let bubbleStyles: StyleProp<ViewStyle | TextStyle>[] = [
        styles(theme).bubbleContainer,
    ]
    let textStyles: StyleProp<ViewStyle | TextStyle>[] = [
        styles(theme).messageText,
    ]

    // Set alignment (left/right) based on sender
    if (sentByMe) {
        bubbleStyles.push(styles(theme).rightAlignedMessage)
    } else {
        bubbleStyles.push(styles(theme).leftAlignedMessage)
    }

    if (payment) {
        bubbleStyles.push(styles(theme).orangeBubble)
    } else if (sentByMe) {
        if (last) {
            bubbleStyles.push(styles(theme).lastSentMessage)
        }
        bubbleGradient = {
            colors: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)'],
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 },
        }
        bubbleStyles.push(styles(theme).blueBubble)
        textStyles.push(styles(theme).sentMessageText)
    } else {
        if (last) {
            bubbleStyles.push(styles(theme).lastReceivedMessage)
        }
        bubbleStyles.push(styles(theme).greyBubble)
        textStyles.push(styles(theme).receivedMessageText)
    }

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).contentContainer}>
                <OptionalGradient
                    gradient={bubbleGradient}
                    style={bubbleStyles}>
                    {payment ? (
                        <PaymentMessage message={message} />
                    ) : (
                        <MessageContents
                            sentByMe={sentByMe}
                            content={message.content}
                            textStyles={textStyles}
                        />
                    )}
                </OptionalGradient>
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.xxs,
        },
        avatarContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginRight: theme.spacing.xs,
        },
        bubbleContainer: {
            marginTop: theme.spacing.xxs,
            padding: 10,
            borderRadius: 16,
            maxWidth: theme.sizes.maxMessageWidth,
        },
        contentContainer: {
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
            width: '100%',
        },
        leftAlignedMessage: {
            marginRight: 'auto',
        },
        rightAlignedMessage: {
            marginLeft: 'auto',
        },
        lastReceivedMessage: {
            borderBottomLeftRadius: 2,
        },
        lastSentMessage: {
            borderBottomRightRadius: 2,
        },
        greyBubble: {
            backgroundColor: theme.colors.extraLightGrey,
        },
        blueBubble: {
            backgroundColor: theme.colors.blue,
        },
        orangeBubble: {
            backgroundColor: theme.colors.orange,
        },
        messageText: {
            textAlign: 'left',
            lineHeight: 20,
        },
        receivedMessageText: {
            color: theme.colors.primary,
        },
        sentMessageText: {
            color: theme.colors.secondary,
        },
    })

export default MessageItem
