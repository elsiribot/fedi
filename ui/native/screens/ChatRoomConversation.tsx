import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { DocumentPickerResponse } from 'react-native-document-picker'
import RNFS from 'react-native-fs'
import { Asset } from 'react-native-image-picker'

import { useToast } from '@fedi/common/hooks/toast'
import {
    selectGroupPreview,
    selectMatrixRoom,
    sendMatrixMessage,
} from '@fedi/common/redux'
import { ChatType } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../bridge'
import ChatConversation from '../components/feature/chat/ChatConversation'
import ChatPreviewConversation from '../components/feature/chat/ChatPreviewConversation'
import MessageInput from '../components/feature/chat/MessageInput'
import SelectedMessageOverlay from '../components/feature/chat/SelectedMessageOverlay'
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
    const { roomId, chatType = ChatType.group } = route.params
    const [isSending, setIsSending] = useState(false)
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const groupPreview = useAppSelector(s => selectGroupPreview(s, roomId))
    const toast = useToast()

    const directUserId = useMemo(() => room?.directUserId, [room])

    const handleSend = useCallback(
        async (
            body: string,
            attachments: Array<Asset | DocumentPickerResponse> = [],
        ) => {
            if ((!body && !attachments.length) || isSending) return

            setIsSending(true)
            try {
                if (body) {
                    await dispatch(
                        sendMatrixMessage({
                            fedimint,
                            roomId,
                            body,
                            // TODO: support intercepting bolt11 for group chats
                            options: { interceptBolt11: chatType === 'direct' },
                        }),
                    ).unwrap()
                }

                for (const att of attachments) {
                    if (!att.uri) continue

                    let attName: string
                    let fileName: string

                    if ('fileName' in att && att.fileName) {
                        attName = att.fileName.split('.')[0]
                        fileName = att.fileName
                    } else if ('name' in att && att.name) {
                        attName = att.name.split('.')[0]
                        fileName = att.name
                    } else {
                        continue
                    }

                    // Has to be a directory so the file can be copied into it
                    const fileDestination = `${RNFS.TemporaryDirectoryPath}/${attName}`

                    // Delete the temporary file if it already exists
                    if (await RNFS.exists(fileDestination)) {
                        await RNFS.unlink(fileDestination)
                    }

                    await RNFS.copyFile(att.uri, fileDestination)

                    await fedimint.matrixSendAttachment({
                        roomId,
                        // Generates a random string in base 36 if no filename is provided
                        filename: fileName,
                        params:
                            'width' in att
                                ? {
                                      mimeType: att.type || '',
                                      width: att.width || 0,
                                      height: att.height || 0,
                                  }
                                : {
                                      mimeType: att.type || '',
                                      width: null,
                                      height: null,
                                  },
                        filePath: fileDestination,
                    })
                }
            } catch (err) {
                log.error('error sending message', err)
                toast.error(t, 'errors.unknown-error')
            } finally {
                setIsSending(false)
            }
        },
        [chatType, dispatch, isSending, roomId, t, toast],
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

    const style = useMemo(() => styles(theme), [theme])

    if (!room) {
        if (groupPreview) {
            return (
                <ChatPreviewConversation id={roomId} preview={groupPreview} />
            )
        }

        return (
            <View style={style.loader}>
                <HoloLoader size={28} />
            </View>
        )
    }

    return (
        <>
            <View style={style.container}>{content}</View>
            <SelectedMessageOverlay />
        </>
    )
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
