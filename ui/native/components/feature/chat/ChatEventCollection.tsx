import { useNavigation } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { selectMatrixAuth, selectMatrixRoomMembers } from '@fedi/common/redux'
import { MatrixEvent } from '@fedi/common/types'
import dateUtils from '@fedi/common/utils/DateUtils'
import { jidToId } from '@fedi/common/utils/chat'
import { matrixIdToUsername } from '@fedi/common/utils/matrix'

import { useAppSelector } from '../../../state/hooks'
import ChatAvatar from './ChatAvatar'
import ChatEvent from './ChatEvent'
import { MessageItemError } from './MessageItemError'

interface Props {
    roomId: string
    collection: MatrixEvent[][]
    showUsernames?: boolean
}

const ChatEventCollection: React.FC<Props> = ({
    roomId,
    collection,
    showUsernames,
}: Props) => {
    const { theme } = useTheme()
    const navigation = useNavigation()

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
                {collection.map(events => {
                    if (!events.length) return null
                    const sentBy = events[0].senderId || ''

                    const roomMember = roomMembers.find(m => m.id === sentBy)
                    const isMe = sentBy === matrixAuth?.userId
                    return (
                        <View style={style.senderGroup} key={events[0].id}>
                            {showUsernames && !isMe && (
                                <View style={style.senderNameContainer}>
                                    <Text tiny>
                                        {roomMember?.displayName || '...'}
                                        {/* {roomMember?.displayName ||
                                            matrixIdToUsername(sentBy)} */}
                                    </Text>
                                </View>
                            )}
                            <View style={style.senderGroupContent}>
                                {!isMe && showUsernames && (
                                    <Pressable
                                        style={style.senderAvatar}
                                        onPress={() => {
                                            if (sentBy) {
                                                navigation.navigate(
                                                    'DirectChat',
                                                    {
                                                        memberId: sentBy,
                                                    },
                                                )
                                            }
                                        }}>
                                        <ChatAvatar
                                            user={roomMember || { id: sentBy }}
                                        />
                                    </Pressable>
                                )}
                                <View style={style.senderMessages}>
                                    {events.map((event, index) => (
                                        <ErrorBoundary
                                            key={event.id || index}
                                            fallback={() => (
                                                <MessageItemError />
                                            )}>
                                            <ChatEvent
                                                event={event}
                                                last={index === 0}
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
            paddingLeft: 50,
        },
        senderMessages: {
            flexDirection: 'column-reverse',
        },
    })

export default ChatEventCollection
