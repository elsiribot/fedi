import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MessageInput from '../components/feature/community/MessageInput'
import MessagesList from '../components/feature/community/MessagesList'
import { useCommunityContext } from '../state/contexts/CommunityContext'

import type { RootStackParamList } from '../types/navigation'

import { useXmpp } from '../state/hooks'

export type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

const Room: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { room: currentRoom } = route.params
    const { state, dispatch } = useCommunityContext()
    const { enterMucRoom, sendGroupMessage } = useXmpp()

    const messagesInRoom = state.messages.filter(
        m => m.sentIn?.id === currentRoom.id,
    )

    console.log(state.messages)

    // Subscribe to new messages
    // Fetch any unreceived messages

    useEffect(() => {
        // announce presence
        enterMucRoom(currentRoom)
    }, [currentRoom, enterMucRoom])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messagesInRoom} />
            <MessageInput
                onMessageSubmitted={messageText => {
                    console.info('send message')
                    console.info(messageText)
                    sendGroupMessage({
                        toRoom: currentRoom.id,
                        text: messageText,
                    })
                    // TODO: add message locally and validate later
                    // when server confirms sent message (smoother UX)
                    // dispatch(
                    //     addToMessages(
                    //         new Message({
                    //             id: randomId(),
                    //             content: messageText,
                    //             sentBy: new Member({ username: 'me' }),
                    //             sentIn: currentRoom,
                    //             sentAt: Date.now(),
                    //         }),
                    //     ),
                    // )
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
