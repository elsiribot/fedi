import React from 'react'

import { useMatrixRepliedMessage } from '@fedi/common/hooks/matrix'
import {
    selectMatrixAuth,
    selectMatrixRoomMembers,
    setSelectedChatMessage,
} from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import { parseMessageText } from '@fedi/common/utils/chat'
import { MatrixEventContentType } from '@fedi/common/utils/matrix'

import { useAppDispatch, useAppSelector } from '../../hooks'
import { styled } from '../../styles'
import { ChatRepliedMessage } from './ChatRepliedMessage'

interface Props {
    event: MatrixEvent<MatrixEventContentType<'m.text'>>
    onReplyTap?: (eventId: string) => void
}

const renderTextWithBreaks = (text: string) => {
    return text.split(/\r?\n/).map((part, index, array) => (
        <React.Fragment key={index}>
            {part}
            {index !== array.length - 1 && <br />}
        </React.Fragment>
    ))
}

export const ChatTextEvent: React.FC<Props> = ({ event, onReplyTap }) => {
    const { repliedData, strippedBody } = useMatrixRepliedMessage(event)

    const matrixAuth = useAppSelector(selectMatrixAuth)
    const dispatch = useAppDispatch()

    const roomMembers = useAppSelector(s => {
        if (!event.roomId) return []
        const members = selectMatrixRoomMembers(s, event.roomId)
        return members || []
    })

    const isMe = event.senderId === matrixAuth?.userId

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault()
        dispatch(setSelectedChatMessage(event))
    }

    const body = strippedBody || event.content.body
    const segments = parseMessageText(body)

    return (
        <div onContextMenu={handleContextMenu} style={{ position: 'relative' }}>
            {repliedData && onReplyTap && (
                <ReplyContainer>
                    <ChatRepliedMessage
                        repliedData={repliedData}
                        onReplyTap={onReplyTap}
                        roomMembers={roomMembers}
                        isFromCurrentUser={isMe}
                    />
                </ReplyContainer>
            )}
            <div>
                {segments.map((segment, index) => (
                    <React.Fragment key={index}>
                        {segment.type === 'text' ? (
                            renderTextWithBreaks(segment.content)
                        ) : (
                            <ExternalLink
                                href={segment.content}
                                target="_blank"
                                rel="noopener noreferrer">
                                {segment.content}
                            </ExternalLink>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    )
}

const ExternalLink = styled('a', {
    textDecoration: 'underline',
    '&:hover': {
        opacity: 0.8,
    },
})

const ReplyContainer = styled('div', {
    marginBottom: '$md',
    alignSelf: 'stretch',
    margin: '4px',
    position: 'relative',
    zIndex: 1,
    pointerEvents: 'none',

    '& *': {
        pointerEvents: 'auto',
    },
})
