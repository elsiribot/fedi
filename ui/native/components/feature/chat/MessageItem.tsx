import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Linking,
    Pressable,
    StyleProp,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'
import Hyperlink from 'react-native-hyperlink'

import { selectAuthenticatedMember } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { Message } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
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
    const navigation = useNavigation<NavigationHook>()
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)

    const { sentBy, payment } = message

    const sentByMe = sentBy?.username === authenticatedMember?.username

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
            <Pressable
                // link to direct chat but only for incoming messages
                // in group chats
                disabled={sentByMe || multiUserChat === false}
                onPress={() => {
                    if (sentBy) {
                        navigation.navigate('DirectChat', { member: sentBy })
                    }
                }}
                style={styles(theme).messageContainer}>
                <View style={styles(theme).contentContainer}>
                    <View style={bubbleStyles}>
                        {payment ? (
                            <PaymentMessage message={message} />
                        ) : (
                            <Hyperlink
                                linkStyle={
                                    sentByMe
                                        ? styles(theme).outgoingLinkedText
                                        : styles(theme).incomingLinkedText
                                }
                                onPress={url => Linking.openURL(url)}>
                                <MessageContents
                                    content={message.content}
                                    textStyles={textStyles}
                                />
                            </Hyperlink>
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {},
        avatarContainer: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginRight: theme.spacing.xs,
        },
        bubbleContainer: {
            marginTop: theme.spacing.xxs,
            padding: theme.spacing.sm,
            borderRadius: 12,
            maxWidth: theme.sizes.maxMessageWidth,
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
            borderBottomLeftRadius: 2,
        },
        lastSentMessage: {
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
        incomingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.blue,
        },
        outgoingLinkedText: {
            textDecorationLine: 'underline',
            color: theme.colors.primary,
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
