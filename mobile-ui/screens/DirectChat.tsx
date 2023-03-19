import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { orderBy } from 'lodash'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import {
    addToMembersSeen,
    addToMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useXmpp } from '../state/hooks/chat'
import { Keypair, Message } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'DirectChat'>

const DirectChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { member } = route.params
    const { state, dispatch } = useChatContext()
    const { getPublicKeyFor, sendDirectMessage } = useXmpp()

    useEffect(() => {
        if (member) {
            getPublicKeyFor(member)
        }
    }, [getPublicKeyFor, member])

    const messagesWithMember = state.messages.filter(m => {
        if (
            (m.sentBy?.username === member.username ||
                m.sentTo?.username === member.username) &&
            // filter out groupchat messages
            !m.sentIn
        ) {
            return true
        }
    })
    const sortedMessages = [...orderBy(messagesWithMember, 'sentAt', 'asc')]

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={sortedMessages} />
            <MessageInput
                onMessageSubmitted={messageText => {
                    const newMessage = new Message({
                        id: uuid.v4(),
                        content: messageText,
                        sentAt: Date.now() / 1000,
                        sentBy: state.authenticatedMember,
                        sentTo: member,
                    })

                    const withEncryptionKeys = state.encryptionKeys as Keypair
                    sendDirectMessage(member, newMessage, withEncryptionKeys)
                    dispatch(addToMessages(newMessage))
                    dispatch(addToMembersSeen(member))
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
    })

export default DirectChat
