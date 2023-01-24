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

export type Props = NativeStackScreenProps<RootStackParamList, 'GroupChat'>

const GroupChat: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { group: currentGroup } = route.params
    const { state, dispatch } = useCommunityContext()
    const { enterMucRoom, sendGroupMessage } = useXmpp()

    const messagesInGroup = state.messages.filter(
        m => m.sentIn?.id === currentGroup.id,
    )
    const sortedMessages = [...orderBy(messagesInGroup, 'receivedAt', 'asc')]

    useEffect(() => {
        // announce presence
        enterMucRoom(currentGroup)
        // TODO: some new messages will be received automatically after
        // enterMucRoom is called but we should check archive here
        // to make sure we get them all
    }, [currentGroup, enterMucRoom])

    return (
        <View style={styles(theme).container}>
            <MessagesList messages={sortedMessages} multiUserChat />
            <MessageInput
                onMessageSubmitted={messageText => {
                    sendGroupMessage({
                        toRoom: currentGroup.id,
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

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default GroupChat
