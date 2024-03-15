import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme, Text } from '@rneui/themed'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectMatrixRoom,
    selectMatrixRoomEvents,
    sendMatrixMessage,
} from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import ChatConversation from '../components/feature/chat/ChatConversation'
import MessageInput from '../components/feature/chat/MessageInput'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('ChatRoomConversation')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatRoomConversation'
>

const ChatRoomConversation: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const dispatch = useAppDispatch()
    const { roomId, chatType } = route.params
    const [isSending, setIsSending] = useState(false)
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const events = useAppSelector(s => selectMatrixRoomEvents(s, roomId))
    const toast = useToast()
    const isLoading = useMemo(() => {
        return !room || !events
    }, [room, events])

    const directUserId = room?.directUserId

    // TODO: reimplement read message hook for matrix
    // const isFocused = useIsFocused()
    // useUpdateLastMessageRead(memberId, messages, isFocused !== true)

    const handleSend = useCallback(
        async (body: string) => {
            if (!body || isSending) return
            setIsSending(true)
            try {
                await dispatch(sendMatrixMessage({ roomId, body })).unwrap()
            } catch (err) {
                log.error('error sending message', err)
                toast.error(t, 'errors.unknown-error')
            }
            setIsSending(false)
        },
        [dispatch, roomId, t],
    )

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
                        events={events}
                    />
                    <MessageInput
                        onMessageSubmitted={handleSend}
                        id={room?.id || directUserId || ''}
                    />
                </>
            )
        }
    }, [isLoading, room, chatType, roomId, events, handleSend, directUserId])

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
