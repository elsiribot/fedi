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
} from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'
import { makeMatrixEventGroups } from '@fedi/common/utils/matrix'

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
    const navigation = useNavigation<NavigationHook>()
    const matrixAuth = useAppSelector(selectMatrixAuth)
    const dispatch = useAppDispatch()
    const { roomId } = route.params
    console.debug('roomId', roomId)
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const events = useAppSelector(s => selectMatrixRoomEvents(s, roomId))
    const eventGroups = useMemo(
        () => makeMatrixEventGroups(events, 'desc'),
        [events],
    )
    useObserveMatrixRoom(roomId)

    const directUserId = room?.directUserId

    // TODO: reimplement read message hook for matrix
    // const isFocused = useIsFocused()
    // useUpdateLastMessageRead(memberId, messages, isFocused !== true)

    const handleSend = useCallback(
        async (body: string) => {
            await dispatch(sendMatrixMessage({ roomId, body })).unwrap()
            // await dispatch(
            //     sendMatrixDirectMessage({ userId, body }),
            // ).unwrap()
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
            // TODO: use new toast manager
            // showErrorToast(err, 'errors.unknown-error')
        }
        return { end }
    }, [dispatch, roomId])

    let content: React.ReactNode
    if (!room) {
        content = (
            <Text style={styles(theme).centeredText}>
                {t('feature.chat.member-not-found', { username: roomId })}
            </Text>
        )
    } else {
        content = (
            <>
                <ChatConversation
                    type={ChatType.direct}
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
