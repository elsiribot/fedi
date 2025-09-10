import React, { useMemo, useState, useCallback } from 'react'

import { ReplyMessageData, matrixIdToUsername } from '@fedi/common/utils/matrix'

import { styled, theme } from '../../styles'

interface Props {
    repliedData: ReplyMessageData
    onReplyTap?: (eventId: string) => void
    roomMembers: Array<{ id: string; displayName?: string }>
    isFromCurrentUser?: boolean
}

export const ChatRepliedMessage: React.FC<Props> = ({
    repliedData,
    onReplyTap,
    roomMembers,
    isFromCurrentUser = false,
}) => {
    const [isPressed, setIsPressed] = useState(false)

    const senderName = useMemo(() => {
        return (
            roomMembers?.find(member => member.id === repliedData?.senderId)
                ?.displayName || matrixIdToUsername(repliedData?.senderId)
        )
    }, [repliedData?.senderId, roomMembers])

    const truncatedBody = useMemo(() => {
        const body = repliedData.body || 'Message'
        // Dynamically adjust truncation length based on message size for better readability
        // Longer messages get more characters before truncation to preserve context
        const maxLength =
            body.length > 150 ? 200 : body.length > 100 ? 150 : 100
        return body.length > maxLength
            ? `${body.substring(0, maxLength)}...`
            : body
    }, [repliedData.body])

    const handleClick = useCallback(() => {
        if (onReplyTap && repliedData.eventId) {
            onReplyTap(repliedData.eventId)
        }
    }, [onReplyTap, repliedData.eventId])

    const handleMouseDown = useCallback(() => setIsPressed(true), [])
    const handleMouseUp = useCallback(() => setIsPressed(false), [])
    const handleMouseLeave = useCallback(() => setIsPressed(false), [])

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick()
            }
        },
        [handleClick],
    )

    return (
        <ReplyContainer
            isFromCurrentUser={isFromCurrentUser}
            isPressed={isPressed}
            onClick={handleClick}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-label={`Reply to message from ${senderName}: ${truncatedBody}`}>
            <ReplyIndicator isFromCurrentUser={isFromCurrentUser} />

            <ReplyContent>
                <SenderRow>
                    <SenderAvatar isFromCurrentUser={isFromCurrentUser}>
                        {senderName.charAt(0).toUpperCase()}
                    </SenderAvatar>
                    <SenderName isFromCurrentUser={isFromCurrentUser}>
                        {senderName}
                    </SenderName>
                    <ReplyIcon isFromCurrentUser={isFromCurrentUser}>
                        ↗
                    </ReplyIcon>
                </SenderRow>

                <ReplyBody isFromCurrentUser={isFromCurrentUser}>
                    {truncatedBody}
                </ReplyBody>
            </ReplyContent>
        </ReplyContainer>
    )
}

const ReplyContainer = styled('div', {
    borderRadius: 8,
    borderLeftWidth: 3,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderStyle: 'solid',
    minHeight: 60,
    maxHeight: 120,
    width: '100%',
    minWidth: 100,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    transform: 'translateZ(0)',
    paddingLeft: 8,

    '&:hover': {
        transform: 'translateY(-1px) translateZ(0)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    },

    '&:focus': {
        outline: `2px solid ${theme.colors.primary}`,
        outlineOffset: 2,
    },

    variants: {
        isFromCurrentUser: {
            true: {
                backgroundColor: theme.colors.white10,
                borderLeftColor: theme.colors.white,
                borderRightColor: theme.colors.white20,
                borderTopColor: theme.colors.white20,
                borderBottomColor: theme.colors.white20,
            },
            false: {
                backgroundColor: theme.colors.primary05,
                borderLeftColor: theme.colors.primary20,
                borderRightColor: theme.colors.primary10,
                borderTopColor: theme.colors.primary10,
                borderBottomColor: theme.colors.primary10,
            },
        },
        isPressed: {
            true: {
                transform: 'scale(0.98) translateZ(0)',
            },
        },
    },
})

const ReplyIndicator = styled('div', {
    position: 'absolute',
    left: 2,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 4,
    height: 34,
    borderRadius: 2,
    flexShrink: 0,

    variants: {
        isFromCurrentUser: {
            true: {
                backgroundColor: theme.colors.white,
            },
            false: {
                backgroundColor: theme.colors.primary20,
            },
        },
    },
})

const ReplyContent = styled('div', {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '8px 8px 8px 12px',
    gap: 2,
})

const SenderRow = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 16,
    marginBottom: 2,
})

const SenderAvatar = styled('div', {
    width: 16,
    height: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontSize: 9,
    fontWeight: 700,

    variants: {
        isFromCurrentUser: {
            true: {
                backgroundColor: theme.colors.white30,
                color: theme.colors.white,
            },
            false: {
                backgroundColor: theme.colors.primary10,
                color: theme.colors.primary,
            },
        },
    },
})

const SenderName = styled('div', {
    fontSize: 12,
    fontWeight: 600,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',

    variants: {
        isFromCurrentUser: {
            true: {
                color: theme.colors.white,
            },
            false: {
                color: theme.colors.primary,
            },
        },
    },
})

const ReplyIcon = styled('div', {
    width: 14,
    height: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    flexShrink: 0,
    fontSize: 11,
    fontWeight: 600,

    variants: {
        isFromCurrentUser: {
            true: {
                color: theme.colors.white,
            },
            false: {
                color: theme.colors.darkGrey,
            },
        },
    },
})

const ReplyBody = styled('div', {
    fontSize: 12,
    lineHeight: '16px',
    fontStyle: 'italic',
    opacity: 0.9,
    minHeight: 16,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',

    variants: {
        isFromCurrentUser: {
            true: {
                color: theme.colors.white,
            },
            false: {
                color: theme.colors.grey,
            },
        },
    },
})
