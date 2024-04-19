import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectMatrixAuth, selectMatrixRoomMembers } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'

// import { matrixIdToUsername } from '@fedi/common/utils/matrix'
import { useAppSelector } from '../../../state/hooks'
import ChatAvatar from './ChatAvatar'
import ChatEvent from './ChatEvent'
import { MessageItemError } from './MessageItemError'

interface Props {
    roomId: string
    collection: MatrixEvent[][]
    onSelect: (userId: string) => void
    showUsernames?: boolean
}

const ChatEventCollection: React.FC<Props> = ({
    roomId,
    collection,
    onSelect,
    showUsernames,
}: Props) => {
    const { theme } = useTheme()

    const matrixAuth = useAppSelector(selectMatrixAuth)
    const roomMembers = useAppSelector(s => selectMatrixRoomMembers(s, roomId))

    const earliestEvent = collection.slice(-1)[0].slice(-1)[0]

    const style = styles(theme)

    return (
        <View style={style.container}>
            {earliestEvent.timestamp && (
                <View style={style.timestampContainer}>
                    <Text tiny style={style.timestampText}>
                        {dateUtils.formatMessageItemTimestamp(
                            earliestEvent.timestamp / 1000,
                        )}
                    </Text>
                </View>
            )}
            <View style={style.sendersContainer}>
                {collection.map((events, index) => {
                    if (!events.length) return null
                    const sentBy = events[0].senderId || ''

                    const roomMember = roomMembers.find(m => m.id === sentBy)
                    const isMe = sentBy === matrixAuth?.userId
                    const hasLeft = roomMember?.membership !== 'join'
                    const isBanned = roomMember?.membership === 'ban'
                    const displayName = isBanned
                        ? 'removed Member'
                        : hasLeft
                        ? 'Former Member'
                        : roomMember?.displayName || '...'
                    return (
                        <View style={style.senderGroup} key={`ceci-${index}`}>
                            {showUsernames && !isMe && (
                                <View style={style.senderNameContainer}>
                                    <Text tiny>{displayName}</Text>
                                </View>
                            )}
                            <View style={style.senderGroupContent}>
                                {!isMe && showUsernames && (
                                    <Pressable
                                        style={style.senderAvatar}
                                        onPress={() =>
                                            roomMember &&
                                            !hasLeft &&
                                            onSelect(roomMember.id)
                                        }>
                                        <ChatAvatar
                                            user={roomMember || { id: sentBy }}
                                        />
                                    </Pressable>
                                )}
                                <View style={style.senderMessages}>
                                    {events.map((event, eindex) => (
                                        <ErrorBoundary
                                            key={`ceci-eb-${event.id}-${eindex}`}
                                            fallback={() => (
                                                <MessageItemError />
                                            )}>
                                            <ChatEvent
                                                event={event}
                                                last={eindex === 0}
                                            />
                                        </ErrorBoundary>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )
                })}
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            marginBottom: theme.spacing.md,
            color: theme.colors.darkGrey,
        },
        timestampContainer: {
            alignItems: 'center',
            width: '100%',
            marginBottom: theme.spacing.md,
        },
        timestampText: {
            color: theme.colors.darkGrey,
        },
        sendersContainer: {
            flexDirection: 'column-reverse',
        },
        senderGroup: {
            marginBottom: theme.spacing.md,
        },
        senderAvatar: {
            flexDirection: 'row',
            alignItems: 'flex-end',
            marginRight: theme.spacing.sm,
        },
        senderGroupContent: {
            flexDirection: 'row',
            alignItems: 'flex-end',
        },
        senderNameContainer: {
            paddingLeft: 43,
        },
        senderMessages: {
            flexDirection: 'column-reverse',
        },
    })

const areEqual = (prev: Props, curr: Props) => {
    return prev.collection[0][0].id === curr.collection[0][0].id
}

export default React.memo(ChatEventCollection, areEqual)
