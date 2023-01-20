import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import { t } from 'i18next'
import React from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { DEFAULT_ROOM_NAME } from '../../../constants'
import { useCommunityContext } from '../../../state/contexts/CommunityContext'
import { Message, Room } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import RoomTile from './RoomTile'

const WINDOW_WIDTH = Dimensions.get('window').width
// const CIRCLE_SIZE = WINDOW_WIDTH * 0.25

const RoomsList: React.FC<{}> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { authenticatedMember, rooms, messages } = useCommunityContext().state

    const renderRoom: ListRenderItem<Room> = ({ item }) => {
        return (
            <RoomTile
                room={item}
                selectRoom={(room: Room) => {
                    console.log('go to room detail', room.id)
                    if (room.members?.length === 1) {
                        navigation.navigate('DirectChat', {
                            member: room.members[0],
                        })
                    } else {
                        navigation.navigate('RoomChat', {
                            room: new Room({
                                id: room.id,
                                name: room.name,
                                invitationCode: Room.encodeInvitationLink(
                                    room.id,
                                    room.name || DEFAULT_ROOM_NAME,
                                ),
                            }),
                        })
                    }
                }}
            />
        )
    }

    // console.debug('messages', messages)
    const directMessages = messages.filter(m => !m.sentIn)
    // console.debug('directMessages', directMessages)

    // Produce a set of direct chat rooms from all direct messages
    const directChats: Room[] = directMessages.reduce(
        (roomsResult: Room[], m: Message) => {
            // Determine the other member that is not the authenticatedMember
            // since they may have sent or received the message
            let otherMember = m.sentTo
            if (m.sentTo?.username === authenticatedMember?.username) {
                otherMember = m.sentBy
            }
            const existingRoomIndex = roomsResult.findIndex(
                r => r.id === otherMember?.username,
            )

            if (existingRoomIndex === -1) {
                // Add the room if it doesn't exist
                roomsResult.push(
                    new Room({
                        id: otherMember?.username,
                        name: otherMember?.username,
                        members: [otherMember],
                        lastReceivedTimestamp: m.sentAt,
                        // If last message is a payment, render details
                        messagePreview: m.payment
                            ? t('feature.community.payment-requested', {
                                  name: otherMember?.username,
                                  amount: m.payment.amount,
                                  unit: 'SATS',
                              })
                            : m.content,
                    }),
                )
                return roomsResult
            } else {
                // Room exists, check if message previews should be updated
                const updatedRoom = roomsResult[existingRoomIndex]
                if (updatedRoom.lastReceivedTimestamp! < m.sentAt!) {
                    updatedRoom.lastReceivedTimestamp = m.sentAt
                    // If last message is a payment, render details
                    updatedRoom.messagePreview = m.payment
                        ? t('feature.community.payment-requested', {
                              name: otherMember?.username,
                              amount: m.payment.amount,
                              unit: 'SATS',
                          })
                        : m.content

                    roomsResult = roomsResult.map((r: Room, i) =>
                        i === existingRoomIndex ? updatedRoom : r,
                    )
                }
            }
            return roomsResult
        },
        [] as Room[],
    )
    // console.debug('directChats', directChats)

    return (
        <FlatList
            style={styles(theme).container}
            data={[...rooms, ...directChats]}
            renderItem={renderRoom}
            keyExtractor={(item: Room) => `${item.id}`}
            // optimization that allows skipping the measurement of dynamic content
            // for fixed-size list items
            getItemLayout={(data, index) => ({
                length: WINDOW_WIDTH,
                offset: 48 * index,
                index,
            })}
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingRight: theme.spacing.md,
        },
    })

export default RoomsList
