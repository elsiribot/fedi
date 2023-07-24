import { useIsFocused } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useUpdateLastMessageRead } from '@fedi/common/hooks/chat'
import {
    selectChatGroup,
    selectChatGroupRole,
    selectChatMessages,
    sendGroupMessage,
} from '@fedi/common/redux'
import { ChatRole } from '@fedi/common/types'
import { makeMessageGroups } from '@fedi/common/utils/chat'

import MessageInput from '../components/feature/chat/MessageInput'
import MessagesList from '../components/feature/chat/MessagesList'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>

const GroupChat: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { groupId } = route.params
    const isFocused = useIsFocused()
    const federationId = useAppSelector(
        s => s.federation.activeFederationId,
    ) as string
    const group = useAppSelector(s => selectChatGroup(s, groupId))
    const currentGroup = group
    const myRole = useAppSelector(s => selectChatGroupRole(s, groupId))
    const messages = useAppSelector(s => selectChatMessages(s, groupId))
    const dispatch = useAppDispatch()

    const messageCollections = useMemo(
        () => makeMessageGroups(messages, 'desc'),
        [messages],
    )

    // TODO: Should we still try to enter the group on this screen
    // even if we auto-enter all groups when coming online?
    // useEffect(() => {
    //     ...
    // }, [])

    // Use this hook only if the screen is in focus
    useUpdateLastMessageRead(
        groupId,
        messageCollections[0]?.[0]?.[0],
        isFocused !== true,
    )

    const handleSend = async (messageText: string) => {
        await dispatch(
            sendGroupMessage({
                federationId,
                groupId,
                content: messageText,
            }),
        ).unwrap()
    }

    // In a broadcast-only group, members cannot send messages if they have a
    // role of 'visitor'. The creator of the group has the role of 'owner'
    const blockMessageInput =
        currentGroup?.broadcastOnly && myRole === ChatRole.visitor

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={messageCollections} multiUserChat />
            {blockMessageInput ? (
                <Text style={styles(theme).noticeText}>
                    {t('feature.chat.broadcast-only-notice')}
                </Text>
            ) : (
                <MessageInput onMessageSubmitted={handleSend} />
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
