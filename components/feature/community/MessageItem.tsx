import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Pressable,
    StyleProp,
    StyleSheet,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native'

import { useFederationsContext } from '../../../state/contexts/FederationsContext'
import { Message } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import dateUtils from '../../../utils/DateUtils'
import stringUtils from '../../../utils/StringUtils'
import HoloAvatar from '../../ui/HoloAvatar'
import PaymentMessage from './PaymentMessage'

type MessageItemProps = {
    message: Message
    multiUserChat?: boolean
}

const MessageItem: React.FC<MessageItemProps> = ({
    message,
    multiUserChat = false,
}: MessageItemProps) => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { selectedFederation } = useFederationsContext().state

    const { sentBy, sentAt, payment } = message

    const sentByMe = sentBy?.username === selectedFederation?.username

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
        bubbleStyles.push(styles(theme).sentMessage)
        bubbleStyles.push(styles(theme).blueBubble)
        textStyles.push(styles(theme).sentMessageText)
    } else {
        bubbleStyles.push(styles(theme).receivedMessage)
        bubbleStyles.push(styles(theme).greyBubble)
        textStyles.push(styles(theme).receivedMessageText)
    }

    const shouldShowTimestamp = sentAt !== undefined

    return (
        <View style={styles(theme).container}>
            {shouldShowTimestamp && (
                <View style={styles(theme).timestampContainer}>
                    <Text tiny>
                        {dateUtils.formatChatTileTimestamp(sentAt!)}
                    </Text>
                </View>
            )}
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
                {!sentByMe && multiUserChat && (
                    <View style={styles(theme).avatarContainer}>
                        <HoloAvatar
                            title={stringUtils.getInitialsFromName(
                                sentBy?.username!,
                            )}
                        />
                    </View>
                )}

                <View style={styles(theme).contentContainer}>
                    {!sentByMe && multiUserChat && (
                        <View style={styles(theme).senderTextContainer}>
                            <Text tiny style={styles(theme).senderText}>
                                {sentBy?.username}
                            </Text>
                        </View>
                    )}

                    <View style={bubbleStyles}>
                        {payment ? (
                            <PaymentMessage message={message} />
                        ) : (
                            <Text caption medium style={textStyles}>
                                {message.content}
                            </Text>
                        )}
                    </View>
                </View>
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginBottom: theme.spacing.md,
        },
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
        senderTextContainer: {},
        senderText: {},
        timestampContainer: {
            alignItems: 'center',
            width: '100%',
            marginBottom: theme.spacing.md,
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
