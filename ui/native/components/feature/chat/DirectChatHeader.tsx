import { RouteProp, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { selectMatrixRoom, selectMatrixUser } from '@fedi/common/redux'

import { useAppSelector } from '../../../state/hooks'
import { RootStackParamList } from '../../../types/navigation'
import Avatar, { AvatarSize } from '../../ui/Avatar'
import Header from '../../ui/Header'
import ChatAvatar from './ChatAvatar'
import { ChatConnectionBadge } from './ChatConnectionBadge'

type ChatRouteProp = RouteProp<RootStackParamList, 'ChatRoomConversation'>

const DirectChatHeader: React.FC = () => {
    const { theme } = useTheme()
    const route = useRoute<ChatRouteProp>()
    const { roomId } = route.params
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const user = useAppSelector(s => selectMatrixUser(s, roomId))

    let avatar: React.ReactNode
    let name: string = ''
    if (room) {
        name = room?.name
        avatar = <ChatAvatar room={room} size={AvatarSize.sm} />
    } else if (user) {
        name = user?.displayName || user?.id
        avatar = <ChatAvatar user={user} size={AvatarSize.sm} />
    } else {
        avatar = <Avatar size={AvatarSize.sm} id={''} name={name} />
    }

    return (
        <>
            <Header
                backButton
                containerStyle={styles(theme).container}
                leftContainerStyle={styles(theme).headerLeftContainer}
                centerContainerStyle={styles(theme).headerCenterContainer}
                headerCenter={
                    <Pressable
                        disabled
                        style={styles(theme).memberContainer}
                        onPress={() => {
                            // TODO: implement admin settings for 1on1 chat
                            // navigation.navigate('GroupAdmin', { group })
                        }}>
                        {avatar}
                        <Text
                            bold
                            numberOfLines={1}
                            style={styles(theme).memberText}>
                            {name}
                        </Text>
                    </Pressable>
                }
            />
            <ChatConnectionBadge offset={63} />
        </>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
        },
        headerLeftContainer: {
            height: theme.sizes.md,
        },
        headerCenterContainer: {
            flex: 6,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
        },
        memberText: {
            marginLeft: theme.spacing.sm,
        },
        memberContainer: {
            padding: theme.spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
    })

export default DirectChatHeader
