import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { useCommunityContext } from '../../../state/contexts/CommunityContext'
import { Room } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import RoomTile from './RoomTile'

const WINDOW_WIDTH = Dimensions.get('window').width
// const CIRCLE_SIZE = WINDOW_WIDTH * 0.25

const RoomsList: React.FC<{}> = () => {
    const { theme } = useTheme()
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
            style={styles(theme).container}
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
            paddingRight: theme.spacing.md,
        },
    })

export default RoomsList
