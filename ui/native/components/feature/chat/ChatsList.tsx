import { useNavigation } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import {
    selectMatrixOrderedRoomsList,
    selectMatrixStatus,
} from '@fedi/common/redux'
import { MatrixRoom, MatrixSyncStatus } from '@fedi/common/types'

import { useAppSelector } from '../../../state/hooks'
import { NavigationHook } from '../../../types/navigation'
import HoloLoader from '../../ui/HoloLoader'
import ChatTile from './ChatTile'

const WINDOW_WIDTH = Dimensions.get('window').width

const ChatsList: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()

    const rooms = useAppSelector(selectMatrixOrderedRoomsList)
    const syncStatus = useAppSelector(selectMatrixStatus)

    const renderChat: ListRenderItem<MatrixRoom> = ({ item }) => {
        return (
            <ErrorBoundary fallback={null}>
                <ChatTile
                    room={item}
                    selectChat={(chat: MatrixRoom) => {
                        if (chat.directUserId) {
                            navigation.navigate('ChatRoomConversation', {
                                roomId: chat.id,
                            })
                        } else {
                            navigation.navigate('GroupChat', {
                                groupId: chat.id,
                            })
                        }
                    }}
                />
            </ErrorBoundary>
        )
    }

    if (syncStatus === MatrixSyncStatus.initialSync) {
        return <HoloLoader size={30} />
    }

    return (
        <FlatList
            style={styles(theme).container}
            contentContainerStyle={styles(theme).content}
            data={rooms}
            renderItem={renderChat}
            keyExtractor={item => `${item.id}`}
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
            width: '100%',
            paddingRight: theme.spacing.md,
        },
        content: {
            paddingBottom: theme.spacing.sm,
        },
    })

export default ChatsList
