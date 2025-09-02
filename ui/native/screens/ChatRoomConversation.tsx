import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMultispendDisplayUtils } from '@fedi/common/hooks/multispend'
import { useToast } from '@fedi/common/hooks/toast'
import {
    addPreviewMedia,
    selectGroupPreview,
    selectMatrixRoom,
    sendMatrixMessage,
} from '@fedi/common/redux'
import { ChatType, InputAttachment, InputMedia } from '@fedi/common/types'
import { makeLog } from '@fedi/common/utils/log'
import { stripFileUriPrefix } from '@fedi/common/utils/media'

import { fedimint } from '../bridge'
import ChatConversation from '../components/feature/chat/ChatConversation'
import ChatPreviewConversation from '../components/feature/chat/ChatPreviewConversation'
import MessageInput from '../components/feature/chat/MessageInput'
import SelectedMessageOverlay from '../components/feature/chat/SelectedMessageOverlay'
import MultispendChatBanner from '../components/feature/multispend/MultispendChatBanner'
import Flex from '../components/ui/Flex'
import HoloLoader from '../components/ui/HoloLoader'
import KeyboardStickyView from '../components/ui/KeyboardStickyView'
import { useAppDispatch, useAppSelector } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'
import { useChatKeyboardBehavior } from '../utils/hooks/keyboard'
import { isAndroidAPI30Plus } from '../utils/layout'

const log = makeLog('ChatRoomConversation')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChatRoomConversation'
>

const ChatRoomConversation: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { roomId, chatType = ChatType.group } = route.params
    const [isSending, setIsSending] = useState(false)
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const groupPreview = useAppSelector(s => selectGroupPreview(s, roomId))
    const toast = useToast()
    const { shouldShowHeader } = useMultispendDisplayUtils(t, roomId)
    const [replyBarHeight, setReplyBarHeight] = useState(0)

    const directUserId = useMemo(() => room?.directUserId, [room])

    const { bottomOffset, setMessageInputHeight } = useChatKeyboardBehavior()

    const handleSend = useCallback(
        async (
            body: string,
            attachments: Array<InputAttachment | InputMedia> = [],
            repliedEventId?: string | null,
        ) => {
            if ((!body && !attachments.length) || isSending) return

            setIsSending(true)
            try {
                dispatch(
                    addPreviewMedia(attachments.filter(att => 'width' in att)),
                )
                if (body) {
                    await dispatch(
                        sendMatrixMessage({
                            fedimint,
                            roomId,
                            body,
                            repliedEventId: repliedEventId,
                            // TODO: support intercepting bolt11 for group chats
                            options: { interceptBolt11: chatType === 'direct' },
                        }),
                    ).unwrap()
                }

                for (const att of attachments) {
                    const resolvedUri = decodeURI(att.uri)
                    const filePath = stripFileUriPrefix(resolvedUri)

                    const width = 'width' in att ? att.width : null
                    const height = 'height' in att ? att.height : null

                    await fedimint.matrixSendAttachment({
                        roomId,
                        filename: att.fileName,
                        params: {
                            mimeType: att.mimeType,
                            width,
                            height,
                        },
                        filePath,
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
    const shouldUseStickyView = isAndroidAPI30Plus()

    const renderMessageInput = useCallback((): JSX.Element => {
        const input = (
            <MessageInput
                onMessageSubmitted={handleSend}
                id={roomId || directUserId || ''}
                isPublic={room?.isPublic}
                onHeightChanged={setMessageInputHeight}
                onReplyBarHeightChanged={setReplyBarHeight}
            />
        )
        return shouldUseStickyView ? (
            <KeyboardStickyView
                enabledOnIOS={false}
                enabledOnSmallScreens={true}
                enabledOnMediumScreens={true}
                enabledOnLargeScreens={true}
                offsetOpened={0}>
                {input}
            </KeyboardStickyView>
        ) : (
            input
        )
    }, [
        handleSend,
        roomId,
        directUserId,
        room?.isPublic,
        setMessageInputHeight,
        setReplyBarHeight,
        shouldUseStickyView,
    ])

    const content = useMemo(() => {
        return (
            <>
                {shouldShowHeader && <MultispendChatBanner roomId={roomId} />}
                <ChatConversation
                    type={chatType}
                    id={roomId || ''}
                    isPublic={room?.isPublic}
                    newMessageBottomOffset={bottomOffset}
                    replyBarOffset={replyBarHeight}
                />
                {renderMessageInput()}
            </>
        )
    }, [
        roomId,
        chatType,
        room,
        bottomOffset,
        replyBarHeight,
        shouldShowHeader,
        renderMessageInput,
    ])

    if (!room) {
        if (groupPreview) {
            return (
                <ChatPreviewConversation id={roomId} preview={groupPreview} />
            )
        }

        return (
            <Flex align="center">
                <HoloLoader size={28} />
            </Flex>
        )
    }

    return (
        <>
            <Flex grow basis={false}>
                {content}
            </Flex>
            <SelectedMessageOverlay isPublic={!!room.isPublic} />
        </>
    )
}

export default ChatRoomConversation
