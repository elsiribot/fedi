import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useToast } from '@fedi/common/hooks/toast'
import { selectMatrixRoom, sendMatrixMessage } from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'

import ChatConversation from '../components/feature/chat/ChatConversation'
import MessageInput from '../components/feature/chat/MessageInput'
import HoloLoader from '../components/ui/HoloLoader'
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
    const toast = useToast()
    console.error('room', room)

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
        [dispatch, isSending, roomId, t, toast],
    )

    const content = useMemo(() => {
        return (
            <>
                <ChatConversation type={chatType} id={roomId || ''} />
                <MessageInput
                    onMessageSubmitted={handleSend}
                    id={roomId || directUserId || ''}
                />
            </>
        )
    }, [roomId, directUserId, chatType, handleSend])

    const style = styles(theme)

    if (!room) {
        return (
            <View style={style.loader}>
                <HoloLoader size={28} />
            </View>
        )
    }

    return <View style={style.container}>{content}</View>
}

const styles = (_: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        loader: {
            alignItems: 'center',
        },
    })

export default ChatRoomConversation
