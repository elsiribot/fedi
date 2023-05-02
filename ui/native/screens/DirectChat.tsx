import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { orderBy } from 'lodash'
import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import { selectChatEncryptionKeys } from '@fedi/common/redux'
import { Keypair } from '@fedi/common/types'

import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import {
    addToMembersSeen,
    addToMessages,
    useChatContext,
} from '../state/contexts/ChatContext'
import { useAppSelector } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Member, Message } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'DirectChat'>

const DirectChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { member } = route.params
    const activeChatEncryptionKeys = useAppSelector(selectChatEncryptionKeys)
    const { state, dispatch } = useChatContext()
    const { getPublicKeyFor, sendDirectMessage } = useXmpp()

    const { member: currentMember } = route.params
    const { username } = member

    const publicKeyHex = useMemo(
        () =>
            member.publicKeyHex ||
            state.membersSeen.find(
                m => m.username === username && m.publicKeyHex,
            )?.publicKeyHex,
        [username, state.membersSeen, member.publicKeyHex],
    )

    // If we don't have this member's pubkey, fetch it from chat server
    useEffect(() => {
        if (!publicKeyHex) {
            getPublicKeyFor(username)
        }
    }, [publicKeyHex, getPublicKeyFor, username])

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

    const sendMessage = (messageText: string) => {
        try {
            // Ensure we have encryption keys
            if (!activeChatEncryptionKeys) {
                throw new Error('Missing chat encryption keys, cannot send')
            }
            const newMessage = new Message({
                id: uuid.v4(),
                content: messageText,
                sentAt: Date.now() / 1000,
                sentBy: new Member({
                    jid: state.xmppClient?.jid,
                }),
                sentTo: currentMember,
            })

            const withEncryptionKeys = activeChatEncryptionKeys as Keypair
            // Throws if hex key is missing
            sendDirectMessage(username, newMessage, activeChatEncryptionKeys)

            dispatch(addToMessages(newMessage))
            dispatch(addToMembersSeen(currentMember))
        } catch (error) {
            console.error('sendMessage', error)
        }
    }

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={sortedMessages} />
            <MessageInput onMessageSubmitted={sendMessage} />
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
