import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { selectMatrixRoom, selectMatrixUser } from '@fedi/common/redux'
import { getUserSuffix } from '@fedi/common/utils/matrix'

import { useAppSelector } from '../../../state/hooks'
import { RootStackParamList } from '../../../types/navigation'
import Avatar, { AvatarSize } from '../../ui/Avatar'
import Header from '../../ui/Header'
import ChatAvatar from './ChatAvatar'
import { ChatConnectionBadge } from './ChatConnectionBadge'

type ChatRoomRouteProp = RouteProp<RootStackParamList, 'ChatRoomConversation'>
type ChatUserRouteProp = RouteProp<RootStackParamList, 'ChatUserConversation'>

const ChatConversationHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const roomRoute = useRoute<ChatRoomRouteProp>()
    const userRoute = useRoute<ChatUserRouteProp>()
    const { roomId } = roomRoute.params
    const { userId, displayName } = userRoute.params
    const room = useAppSelector(s => selectMatrixRoom(s, roomId))
    const user = useAppSelector(s => selectMatrixUser(s, userId))
    const isGroupChat = room?.directUserId === undefined

    let avatar: React.ReactNode
    let name = ''
    if (room) {
        name = room?.name
        avatar = <ChatAvatar room={room} size={AvatarSize.sm} />
    } else if (user) {
        name = user?.displayName || user?.id
        avatar = <ChatAvatar user={user} size={AvatarSize.sm} />
    } else if (displayName) {
        const placeHolderUser = { id: '', displayName }
        name = displayName
        avatar = <ChatAvatar size={AvatarSize.sm} user={placeHolderUser} />
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
                        disabled={!isGroupChat}
                        style={styles(theme).memberContainer}
                        onPress={() => {
                            // TODO: implement admin settings for 1on1 chat
                            if (isGroupChat) {
                                navigation.navigate('GroupAdmin', { roomId })
                            }
                        }}>
                        {avatar}
                        <View style={styles(theme).textContainer}>
                            <Text
                                bold
                                numberOfLines={1}
                                style={styles(theme).memberText}>
                                {name}
                            </Text>
                            {room?.directUserId && (
                                <Text
                                    caption
                                    numberOfLines={1}
                                    style={styles(theme).shortIdText}>
                                    {getUserSuffix(room.directUserId)}
                                </Text>
                            )}
                        </View>
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
        textContainer: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        shortIdText: {
            marginLeft: theme.spacing.xs,
        },
    })

export default ChatConversationHeader
