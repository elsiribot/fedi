import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import uuid from 'react-native-uuid'

import { makeMessageGroups } from '@fedi/common/utils/chat'

import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import { XMPP_MUC_ROLE_VISITOR } from '../constants'
import {
    addToGroups,
    changeActiveChatId,
    updateGroup,
    useChatContext,
} from '../state/contexts/ChatContext'
import { usePrevious } from '../state/hooks'
import { useXmpp } from '../state/hooks/chat'
import { Group, Member, Message } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>

const GroupChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { state, dispatch } = useChatContext()
    const { enterMucRoom, fetchMucRoomConfig, sendGroupMessage } = useXmpp()
    const { group: currentGroup } = route.params
    const previousGroup = usePrevious(currentGroup)

    const groupedMessages = useMemo(() => {
        // Filter to messages with this group
        const messagesInGroup = state.messages.filter(
            m => m.sentIn?.id === currentGroup?.id,
        )

        // Group by timestamp / sender
        return makeMessageGroups(messagesInGroup, 'desc')
    }, [state.messages, currentGroup?.id])

    // TODO: Refactor useEffects and route param to use Redux selectors
    useEffect(() => {
        // announce presence + add to state.groups
        enterMucRoom(currentGroup)
            .then((enteredGroup: Group) => {
                dispatch(addToGroups(enteredGroup))
                // fetch room config to see if name has changed
                return fetchMucRoomConfig(enteredGroup)
            })
            .then(configuredGroup => {
                dispatch(
                    updateGroup(
                        new Group({
                            ...currentGroup,
                            ...configuredGroup,
                        }),
                    ),
                )
            })
        // TODO: some new messages will be received automatically after
        // enterMucRoom is called but we should check archive here
        // to make sure we get them all
    }, [currentGroup, dispatch, enterMucRoom, fetchMucRoomConfig])

    // update route param if name has changed
    useEffect(() => {
        // fetchMucRoomConfig will update state.groups if name has changed
        const storedGroup = state.groups.find(g => g.id === currentGroup.id)
        if (
            storedGroup &&
            storedGroup?.name &&
            previousGroup?.name &&
            (storedGroup?.name !== previousGroup?.name ||
                storedGroup?.broadcastOnly !== previousGroup?.broadcastOnly)
        ) {
            navigation.setParams({
                group: storedGroup,
            })
        }
    }, [
        currentGroup,
        previousGroup?.name,
        navigation,
        state.groups,
        previousGroup?.broadcastOnly,
    ])

    // Set active chat while we're on this screen
    useEffect(() => {
        dispatch(changeActiveChatId(currentGroup.id))
        return () => dispatch(changeActiveChatId(null))
    }, [dispatch, currentGroup.id])

    // In a broadcast-only group, members cannot send messages if they have a
    // role of 'visitor'. The creator of the group has the role of 'owner'
    const blockMessageInput =
        currentGroup.broadcastOnly &&
        currentGroup.myRole === XMPP_MUC_ROLE_VISITOR

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={groupedMessages} multiUserChat />
            {blockMessageInput ? (
                <Text style={styles(theme).noticeText}>
                    {t('feature.chat.broadcast-only-notice')}
                </Text>
            ) : (
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
                    }}
                />
            )}
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
        noticeText: {
            textAlign: 'center',
            padding: theme.spacing.xl,
            color: theme.colors.primaryLight,
            width: '70%',
        },
    })

export default GroupChat
