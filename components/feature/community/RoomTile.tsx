import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Images } from '../../../assets/images'
import { DEFAULT_ROOM_NAME } from '../../../constants'
import { Room } from '../../../types'
import DateUtils from '../../../utils/DateUtils'

type RoomTileProps = {
    room: Room
    selectRoom: (room: Room) => void
}

const RoomTile = ({ room, selectRoom }: RoomTileProps) => {
    const { theme } = useTheme()

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => selectRoom(room)}>
            <View style={styles(theme).iconContainer}>
                <View
                    style={[
                        styles(theme).unreadIndicator,
                        room.hasNewMessages ? { opacity: 1 } : { opacity: 0 },
                    ]}
                />
                <Image
                    source={room.icon || Images.FediLogoIcon}
                    style={styles(theme).icon}
                />
            </View>
            <View style={styles(theme).contents}>
                <View style={styles(theme).topRow}>
                    <Text bold>{room.name || DEFAULT_ROOM_NAME}</Text>
                    {room.lastReceivedTimestamp && (
                        <Text small>
                            {DateUtils.formatRoomTileTimestamp(
                                room.lastReceivedTimestamp!,
                            )}
                        </Text>
                    )}
                </View>
                <View style={styles(theme).bottomRow}>
                    <Text
                        caption
                        style={styles(theme).messagePreview}
                        numberOfLines={2}>
                        {room.lastMessage?.text || room.messagePreview || ''}
                    </Text>
                    {room.pinned && (
                        <Icon
                            name="pin"
                            type="material-community"
                            size={theme.sizes.xs}
                            containerStyle={styles(theme).pinIcon}
                        />
                    )}
                </View>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 64,
            marginVertical: 10,
        },
        icon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        iconContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            width: '18%',
        },
        contents: {
            width: '82%',
        },
        topRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            height: '40%',
        },
        bottomRow: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: '100%',
            height: '60%',
        },
        messagePreview: {
            width: '90%',
        },
        pinIcon: {
            width: '10%',
            alignItems: 'flex-end',
            transform: [{ rotate: '45deg' }],
        },
        unreadIndicator: {
            backgroundColor: theme.colors.red,
            height: theme.sizes.xxs,
            width: theme.sizes.xxs,
            marginRight: theme.spacing.xs,
            borderRadius: theme.sizes.xxs * 0.5,
        },
    })

export default RoomTile
