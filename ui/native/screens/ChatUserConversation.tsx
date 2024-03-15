import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import {
    selectMatrixAuth,
    selectMatrixDirectMessageRoom,
    selectMatrixUser,
    sendMatrixDirectMessage,
} from '@fedi/common/redux'

import ChatConversation from '../components/feature/chat/ChatConversation'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import { ChatType } from '../types'
import type { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatUserConversation'
>

const ChatUserConversation: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    const { userId } = route.params
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const user = useAppSelector(s => selectMatrixUser(s, userId))
    const existingRoom = useAppSelector(s =>
        selectMatrixDirectMessageRoom(s, userId),
    )

    const dispatch = useAppDispatch()

    // If this is a chat with ourselves, redirect to main chat screen
    const navigate = navigation.navigate
    const naivigationReplace = navigation.replace
    useEffect(() => {
        if (userId === matrixAuth?.userId) {
            navigate('TabsNavigator')
        }
    }, [userId, matrixAuth, navigation])

    // If we already have a chat room with this user, redirect there
    useEffect(() => {
        if (!existingRoom) return
        naivigationReplace('ChatRoomConversation', {
            roomId: existingRoom.id,
            chatType: ChatType.direct,
        })
    }, [existingRoom, naivigationReplace])

    // TODO: reimplement read message hook for matrix
    // Use these hooks only if the screen is in focus, otherwise use pauseUpdates
    // const isFocused = useIsFocused()
    // useUpdateLastMessageRead(memberId, messages, isFocused !== true)

    const handleSend = useCallback(
        async (body: string) => {
            await dispatch(sendMatrixDirectMessage({ userId, body })).unwrap()
            navigate('TabsNavigator')
        },
        [dispatch, userId],
    )

    return (
        <View style={styles(theme).container}>
            <>
                <ChatConversation
                    type={ChatType.direct}
                    id={userId}
                    events={[]}
                />
                {/* <MessageInput
                    onMessageSubmitted={handleSend}
                    memberId={memberId}
                /> */}
            </>
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
        centeredText: {
            textAlign: 'center',
        },
    })

export default ChatUserConversation
