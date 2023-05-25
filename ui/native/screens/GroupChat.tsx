import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import { makeMessageGroups } from '@fedi/common/utils/chat'

import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import {
    addToGroups,
    updateGroup,
    useChatContext,
} from '../state/contexts/ChatContext'
import { usePrevious } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Group, Member, Message } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>

const GroupChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { theme } = useTheme()
    const { state, dispatch } = useChatContext()
    const { enterMucRoom, fetchMucRoomConfig, sendGroupMessage } = useXmpp()
    const { group: currentGroup } = route.params
    const previousGroup = usePrevious(currentGroup)
    // const currentGroup = state.groups.find(g => g.id === group.id)

    const groupedMessages = useMemo(() => {
        // Filter to messages with this group
        const messagesInGroup = state.messages.filter(
            m => m.sentIn?.id === currentGroup?.id,
        )

        // Group by timestamp / sender
        return makeMessageGroups(messagesInGroup, 'asc')
    }, [state.messages, currentGroup?.id])

    useEffect(() => {
        // announce presence + add to state.groups
        enterMucRoom(currentGroup).then((group: Group) => {
            dispatch(addToGroups(group))
        })
        // TODO: some new messages will be received automatically after
        // enterMucRoom is called but we should check archive here
        // to make sure we get them all
    }, [currentGroup, dispatch, enterMucRoom])

    // fetch room config to see if name has changed
    useEffect(() => {
        fetchMucRoomConfig(currentGroup).then(groupName => {
            dispatch(
                updateGroup(
                    new Group({
                        ...currentGroup,
                        name: groupName,
                    }),
                ),
            )
        })
    }, [currentGroup, dispatch, fetchMucRoomConfig])

    // update route param if name has changed
    useEffect(() => {
        // fetchMucRoomConfig will update state.groups if name has changed
        const storedGroup = state.groups.find(g => g.id === currentGroup.id)
        if (
            storedGroup &&
            storedGroup?.name &&
            previousGroup?.name &&
            storedGroup?.name !== previousGroup?.name
        ) {
            navigation.setParams({
                group: storedGroup,
            })
        }
    }, [currentGroup, previousGroup?.name, navigation, state.groups])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={groupedMessages} multiUserChat />
            <MessageInput
                onMessageSubmitted={messageText => {
                    const newMessage = new Message({
                        id: uuid.v4(),
                        content: messageText,
                        sentAt: Date.now() / 1000,
                        sentBy: new Member({
                            jid: state.xmppClient!.jid,
                        }),
                        sentIn: currentGroup,
                    })
                    sendGroupMessage(currentGroup, newMessage)
                    // TODO: add message locally and validate later
                    // when server confirms sent message (smoother UX)
                    // dispatch(
                    //     addToMessages(
                    //         new Message({
                    //             id: randomId(),
                    //             content: messageText,
                    //             sentBy: new Member({ username: 'me' }),
                    //             sentIn: currentGroup,
                    //             sentAt: Date.now(),
                    //         }),
                    //     ),
                    // )
                }}
            />
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

export default GroupChat
