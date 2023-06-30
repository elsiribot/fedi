import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { selectChatMessages, sendDirectMessage } from '@fedi/common/redux'
import { makeMessageGroups } from '@fedi/common/utils/chat'

import { fedimint } from '../bridge'
import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import {
    changeActiveChatId,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'DirectChat'>

const DirectChat: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { memberId } = route.params
    const dispatch = useAppDispatch()
    const activeFederationId = useAppSelector(
        s => s.federation.activeFederationId,
    )
    const { dispatch: chatContextDispatch } = useChatContext()
    const messages = useAppSelector(s => selectChatMessages(s, memberId))

    const messageCollections = useMemo(
        () => makeMessageGroups(messages, 'desc'),
        [messages],
    )

    // Set active chat while we're on this screen
    useEffect(() => {
        chatContextDispatch(changeActiveChatId(memberId))
        return () => {
            chatContextDispatch(changeActiveChatId(null))
        }
    }, [chatContextDispatch, memberId])

    const handleSend = async (messageText: string) => {
        await dispatch(
            sendDirectMessage({
                fedimint,
                federationId: activeFederationId as string,
                recipientId: memberId,
                content: messageText,
            }),
        ).unwrap()
    }

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messageCollections} />
            <MessageInput onMessageSubmitted={handleSend} />
        </View>
    )
}

const styles = (_: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default DirectChat
