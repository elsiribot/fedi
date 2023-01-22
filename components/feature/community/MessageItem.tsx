import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'

import { useFederationsContext } from '../../../state/contexts/FederationsContext'
import { Message } from '../../../types'
import PaymentMessage from './PaymentMessage'

type MessageItemProps = {
    message: Message
}

const MessageItem: React.FC<MessageItemProps> = ({
    message,
}: MessageItemProps) => {
    const { theme } = useTheme()
    const { selectedFederation } = useFederationsContext().state

    const { sentBy, sentAt, payment } = message

    const sentByMe = sentBy?.username === selectedFederation?.username

    let bubbleStyles: StyleProp<ViewStyle | TextStyle>[] = [
        styles(theme).container,
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
        bubbleStyles.push(styles(theme).sentMessage)
        bubbleStyles.push(styles(theme).blueBubble)
        textStyles.push(styles(theme).sentMessageText)
    } else {
        bubbleStyles.push(styles(theme).receivedMessage)
        bubbleStyles.push(styles(theme).greyBubble)
        textStyles.push(styles(theme).receivedMessageText)
    }

    return (
        <View style={bubbleStyles}>
            {payment ? (
                <PaymentMessage message={message} />
            ) : (
                <Text caption medium style={textStyles}>
                    {message.content}
                </Text>
            )}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            padding: theme.spacing.sm,
            marginBottom: theme.spacing.md,
            borderRadius: 12,
            maxWidth: theme.sizes.maxMessageWidth,
        },
        leftAlignedMessage: {
            marginRight: 'auto',
        },
        rightAlignedMessage: {
            marginLeft: 'auto',
        },
        receivedMessage: {
            borderBottomLeftRadius: 2,
        },
        sentMessage: {
            borderBottomRightRadius: 2,
        },
        greyBubble: {
            backgroundColor: theme.colors.lightGrey,
        },
        blueBubble: {
            backgroundColor: theme.colors.blue,
        },
        orangeBubble: {
            backgroundColor: theme.colors.orange,
        },
        messageText: {
            textAlign: 'left',
        },
        receivedMessageText: {
            color: theme.colors.primary,
        },
        sentMessageText: {
            color: theme.colors.secondary,
        },
    })

export default MessageItem
