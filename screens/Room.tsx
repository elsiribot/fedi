import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Image, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native'
import { Images } from '../assets/images'
import { Member, Message } from '../components/feature/community/RoomsList'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

type MessageInputProps = {
    onMessageSubmitted: (message: string) => void
}

const MessageInput: React.FC<MessageInputProps> = ({
    onMessageSubmitted,
}: MessageInputProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [messageText, setMessageText] = useState<string>('')
    const [inputHeight, setInputHeight] = useState<number>(
        theme.sizes.minMessageInputHeight,
    )

    return (
        <View style={styles(theme).messageInputContainer}>
            <Input
                onChangeText={setMessageText}
                value={messageText}
                placeholder={`${t('words.message')}`}
                returnKeyType="send"
                onSubmitEditing={({ nativeEvent: { text } }) => {
                    onMessageSubmitted(text)
                    setMessageText('')
                }}
                onContentSizeChange={({
                    nativeEvent: {
                        contentSize: { height },
                    },
                }) => {
                    if (height > inputHeight) {
                        setInputHeight(
                            Math.min(theme.sizes.maxMessageInputHeight, height),
                        )
                    } else if (height < inputHeight) {
                        setInputHeight(
                            Math.max(theme.sizes.minMessageInputHeight, height),
                        )
                    }
                }}
                containerStyle={[
                    styles(theme).textInputOuter,
                    { height: inputHeight },
                ]}
                inputContainerStyle={styles(theme).textInputInner}
                multiline
                numberOfLines={3}
                blurOnSubmit={true}
            />
            <Image style={styles(theme).icon} source={Images.Cash} />
        </View>
    )
}

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
                styles(theme).messageItemContainer,
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

type MessagesListProps = {
    messages: Message[]
}

const MessagesList: React.FC<MessagesListProps> = ({
    messages,
}: MessagesListProps) => {
    const { theme } = useTheme()
    const renderMessage: ListRenderItem<Message> = ({ item }) => {
        return <MessageItem message={item} />
    }

    return (
        <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item: Message) => `${item.id}`}
            style={styles(theme).messagesListContainer}
        />
    )
}

const randomId = () => {
    return Math.floor(Math.random() * (1000 - 1 + 1) + 1)
}

const Room: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { roomLink } = route.params
    const [messages, setMessages] = useState<Message[]>([])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messages} />
            <MessageInput
                onMessageSubmitted={messageText => {
                    console.info('send message')
                    console.info(messageText)
                    setMessages([
                        ...messages,
                        new Message({
                            id: randomId(),
                            content: messageText,
                            sentBy: new Member({ username: 'me' }),
                        }),
                    ])
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        messagesListContainer: {
            width: '100%',
            paddingHorizontal: theme.spacing.xl,
        },
        messageItemContainer: {
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
        messageInputContainer: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 'auto',
            backgroundColor: theme.colors.keyboardGrey,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
        },
        icon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
            marginLeft: theme.spacing.md,
        },
        textInputInner: {
            borderBottomWidth: 0,
            marginTop: theme.spacing.xs,
        },
        textInputOuter: {
            flex: 1,
            borderColor: theme.colors.primaryVeryLight,
            borderWidth: 1,
            borderRadius: theme.borders.defaultRadius,
            backgroundColor: theme.colors.white,
        },
    })

export default Room
