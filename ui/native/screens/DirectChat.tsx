import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { orderBy } from 'lodash'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

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
    const authenticatedMember = useAppSelector(selectAuthenticatedMember)
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
            // Make sure we have the member's pubkey before trying to send
            if (!currentMember.publicKeyHex) {
                return
            }
            const newMessage = new Message({
                id: uuid.v4(),
                content: messageText,
                sentAt: Date.now() / 1000,
                sentBy: authenticatedMember,
                sentTo: currentMember,
            })

            const withEncryptionKeys = state.encryptionKeys as Keypair
            sendDirectMessage(currentMember, newMessage, withEncryptionKeys)
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
