import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import { orderBy } from 'lodash'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import MessageInput from '../components/feature/community/MessageInput'
import MessagesList from '../components/feature/community/MessagesList'
import { useCommunityContext } from '../state/contexts/CommunityContext'

import type { RootStackParamList } from '../types/navigation'

import { useXmpp } from '../state/hooks'

export type Props = NativeStackScreenProps<RootStackParamList, 'RoomChat'>

const RoomChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { room: currentRoom } = route.params
    const { state, dispatch } = useCommunityContext()
    const { enterMucRoom, sendGroupMessage } = useXmpp()

    const messagesInRoom = state.messages.filter(
        m => m.sentIn?.id === currentRoom.id,
    )
    const sortedMessages = [
        ...orderBy(messagesInRoom, 'receivedAt', 'asc'),
        // new Message({
        //     id: '1',
        //     content: 'test',
        //     sentAt: Date.now() / 1000 - 100000,
        //     sentBy: new Member({
        //         username: 'oz139',
        //         jid: new JID('oz139', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        // }),
        // new Message({
        //     id: '2',
        //     content: 'fedi:ecash-request:',
        //     sentAt: Date.now() / 1000,
        //     sentBy: new Member({
        //         username: 'oz139',
        //         jid: new JID('oz139', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        //     payment: new Payment({
        //         amount: 100000,
        //         memo: 'For coffee',
        //         status: PaymentStatus.requested,
        //     }),
        // }),
        // new Message({
        //     id: '3',
        //     content: 'test from me',
        //     sentAt: Date.now() / 1000 - 100000,
        //     sentBy: new Member({
        //         username: 'oz131',
        //         jid: new JID('oz131', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        // }),
        // new Message({
        //     id: '4',
        //     content: 'fedi:ecash-request:',
        //     sentAt: Date.now() / 1000,
        //     sentBy: new Member({
        //         username: 'oz131',
        //         jid: new JID('oz131', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        //     payment: new Payment({
        //         amount: 1500000,
        //         memo: 'For food',
        //         status: PaymentStatus.requested,
        //     }),
        // }),
        // new Message({
        //     id: '5',
        //     content: 'test from me again',
        //     sentAt: Date.now() / 1000 - 100000,
        //     sentBy: new Member({
        //         username: 'oz131',
        //         jid: new JID('oz131', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        // }),
        // new Message({
        //     id: '6',
        //     content: 'fedi:ecash-request:',
        //     sentAt: Date.now() / 1000,
        //     sentBy: new Member({
        //         username: 'oz139',
        //         jid: new JID('oz139', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        //     payment: new Payment({
        //         amount: 8200000,
        //         memo: 'uber',
        //         status: PaymentStatus.paid,
        //     }),
        // }),
        // new Message({
        //     id: '7',
        //     content: 'fedi:ecash-request:',
        //     sentAt: Date.now() / 1000,
        //     sentBy: new Member({
        //         username: 'oz131',
        //         jid: new JID('oz131', XMPP_DOMAIN, XMPP_RESOURCE),
        //     }),
        //     payment: new Payment({
        //         amount: 4050000,
        //         memo: 'tickets',
        //         status: PaymentStatus.paid,
        //     }),
        // }),
    ]

    // Subscribe to new messages
    // Fetch any unreceived messages

    useEffect(() => {
        // announce presence
        enterMucRoom(currentRoom)
    }, [currentRoom, enterMucRoom])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={sortedMessages} multiUserChat />
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
    })

export default RoomChat
