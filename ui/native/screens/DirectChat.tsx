import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import { selectChatEncryptionKeys } from '@fedi/common/redux'
import { Keypair } from '@fedi/common/types'
import { makeMessageGroups } from '@fedi/common/utils/chat'

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

    useEffect(() => {
        // If we don't have this member's pubkey, check membersSeen
        // or fetch it from chat server
        if (currentMember && !currentMember.publicKeyHex) {
            // Check if we have seen this member before
            const storedMember = state.membersSeen.find(
                (m: Member) => m.username === currentMember.username,
            )
            // If we have seen this member and have their pubkey
            // update the route.params with storedMember
            if (storedMember && storedMember.publicKeyHex) {
                navigation.setParams({
                    member: storedMember,
                })
            } else {
                // otherwsie , getPublicKeyFor will update state.membersSeen
                // with pubkey
                getPublicKeyFor(currentMember)
            }
        }
    }, [currentMember, getPublicKeyFor, navigation, state.membersSeen])

    const sendMessage = (messageText: string) => {
        try {
            // Make sure we have the member's pubkey before trying to send
            if (!currentMember.publicKeyHex) {
                return
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
            sendDirectMessage(currentMember, newMessage, withEncryptionKeys)
            dispatch(addToMessages(newMessage))
            dispatch(addToMembersSeen(currentMember))
        } catch (error) {
            console.error('sendMessage', error)
        }
    }

    const groupedMessages = useMemo(() => {
        // Filter to messages with this member
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

        // Group by timestamp / sender
        return makeMessageGroups(messagesWithMember, 'asc')
    }, [state.messages, member.username])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={groupedMessages} />
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
