import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MessageInput from '../components/feature/community/MessageInput'
import MessagesList from '../components/feature/community/MessagesList'
import {
    addToMessages,
    useCommunityContext,
} from '../state/contexts/CommunityContext'
import { Member, Message } from '../types'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Room'>

const randomId = () => {
    return Math.floor(Math.random() * (1000 - 1 + 1) + 1)
}

const Room: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { roomLink } = route.params
    const { state, dispatch } = useCommunityContext()

    // Subscribe to new messages
    // Fetch any unreceived messages

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={state.messages} />
            <MessageInput
                onMessageSubmitted={messageText => {
                    console.info('send message')
                    console.info(messageText)
                    dispatch(
                        addToMessages(
                            new Message({
                                id: randomId(),
                                content: messageText,
                                sentBy: new Member({ username: 'me' }),
                            }),
                        ),
                    )
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
