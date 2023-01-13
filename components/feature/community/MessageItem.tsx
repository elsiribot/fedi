import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Message } from '../../../types'

type MessageItemProps = {
    message: Message
}

const MessageItem: React.FC<MessageItemProps> = ({
    message,
}: MessageItemProps) => {
    const { theme } = useTheme()

    const sentByMe = message.sentBy?.username === 'me'

    return (
        <View
            style={[
                styles(theme).container,
                sentByMe
                    ? styles(theme).sentMessage
                    : styles(theme).receivedMessage,
            ]}>
            <Text
                caption
                medium
                style={[
                    styles(theme).messageText,
                    sentByMe
                        ? styles(theme).sentMessageText
                        : styles(theme).receivedMessageText,
                ]}>
                {message.content}
            </Text>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginTop: theme.spacing.md,
            padding: theme.spacing.sm,
            borderRadius: 12,
            maxWidth: theme.sizes.maxMessageWidth,
        },
        receivedMessage: {
            backgroundColor: theme.colors.lightGrey,
            borderBottomLeftRadius: 2,
            marginRight: 'auto',
        },
        sentMessage: {
            backgroundColor: theme.colors.blue,
            borderBottomRightRadius: 2,
            marginLeft: 'auto',
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
