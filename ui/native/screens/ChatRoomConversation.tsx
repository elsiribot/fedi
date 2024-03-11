import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme, Text } from '@rneui/themed'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useObserveMatrixRoom } from '@fedi/common/hooks/matrix'
import {
    paginateMatrixRoomTimeline,
    selectMatrixAuth,
    selectMatrixRoom,
    selectMatrixRoomEvents,
    sendMatrixMessage,
    showToast,
} from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'
import { makeMatrixEventGroups } from '@fedi/common/utils/matrix'

import { useToast } from '../../web/src/hooks/toast'
import ChatConversation from '../components/feature/chat/ChatConversation'
import MessageInput from '../components/feature/chat/MessageInput'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatRoomConversation'
>

const ChatRoomConversation: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    // const navigation = useNavigation<NavigationHook>()
    // const matrixAuth = useAppSelector(selectMatrixAuth)
    const dispatch = useAppDispatch()
    const { roomId, chatType } = route.params
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const events = useAppSelector(s => selectMatrixRoomEvents(s, roomId))
    const toast = useToast()
    const isLoading = useMemo(() => {
        return !room || !events
    }, [room, events])

    useObserveMatrixRoom(roomId)

    const directUserId = room?.directUserId

    // TODO: reimplement read message hook for matrix
    // const isFocused = useIsFocused()
    // useUpdateLastMessageRead(memberId, messages, isFocused !== true)

    const handleSend = useCallback(
        async (body: string) => {
            await dispatch(sendMatrixMessage({ roomId, body })).unwrap()
        },
        [dispatch, roomId],
    )

    const handlePaginate = useCallback(async () => {
        let end = false
        try {
            const res = await dispatch(
                paginateMatrixRoomTimeline({ roomId }),
            ).unwrap()
            end = res.end
        } catch (err) {
            toast.showErrorToast(err, t('errors.unknown-error'))
        }
        return { end }
    }, [dispatch, roomId])

    // let content: React.ReactNode
    const content = useMemo(() => {
        if (isLoading) {
            return null
        } else if (!room) {
            return (
                <Text style={styles(theme).centeredText}>
                    {t('feature.chat.member-not-found', { username: roomId })}
                </Text>
            )
        } else {
            return (
                <>
                    <ChatConversation
                        type={chatType}
                        id={room?.id || ''}
                        name={room?.name || ''}
                        events={events}
                        onPaginate={handlePaginate}
                    />
                    <MessageInput
                        onMessageSubmitted={handleSend}
                        directUserId={directUserId}
                    />
                </>
            )
        }
    }, [
        isLoading,
        room,
        chatType,
        roomId,
        events,
        handlePaginate,
        handleSend,
        directUserId,
    ])

    return <View style={styles(theme).container}>{content}</View>
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

export default ChatRoomConversation
