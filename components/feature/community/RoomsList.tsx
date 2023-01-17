import { useNavigation } from '@react-navigation/native'
import { Icon, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { Images } from '../../../assets/images'
import { DEFAULT_ROOM_NAME } from '../../../constants'

import { useCommunityContext } from '../../../state/contexts/CommunityContext'
import { Room } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import DateUtils from '../../../utils/DateUtils'

// UI

type RoomTileProps = {
    room: Room
    selectRoom: (room: Room) => void
}

const RoomTile = ({ room, selectRoom }: RoomTileProps) => {
    const { theme } = useTheme()

    return (
        <TouchableOpacity
            style={styles(theme).tileContainer}
            onPress={() => selectRoom(room)}>
            <View style={styles(theme).tileIconContainer}>
                <Image
                    source={room.icon || Images.FediLogoIcon}
                    style={styles(theme).tileIcon}
                />
            </View>
            <View style={styles(theme).tileContents}>
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
        </TouchableOpacity>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
// const CIRCLE_SIZE = WINDOW_WIDTH * 0.25

const RoomsList: React.FC<{}> = () => {
    const navigation = useNavigation<NavigationHook>()
    const { rooms } = useCommunityContext().state

    const renderRoom: ListRenderItem<Room> = ({ item }) => {
        return (
            <RoomTile
                room={item}
                selectRoom={(room: Room) => {
                    console.log('go to room detail', room.id)
                    navigation.navigate('Room', {
                        room: new Room({
                            id: room.id,
                            name: room.name,
                            invitationCode: `fedi:room:${room.id}::${room.name}`,
                        }),
                    })
                }}
            />
        )
    }

    return (
        <FlatList
            data={rooms}
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
            paddingHorizontal: 24,
        },
        tileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 64,
            marginVertical: 10,
        },
        tileIcon: {
            height: theme.sizes.md,
            width: theme.sizes.md,
        },
        tileIconContainer: {
            alignItems: 'center',
            width: '20%',
        },
        tileContents: {
            width: '80%',
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
    })

export default RoomsList
