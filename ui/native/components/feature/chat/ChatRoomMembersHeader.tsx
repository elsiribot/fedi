import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { ChatRoomMembersProps } from '../../../screens/ChatRoomMembers'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type ChatRoomMembersRouteProp = ChatRoomMembersProps['route']

const ChatRoomMembersHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<ChatRoomMembersRouteProp>()
    const { roomId } = route.params
    const handleInviteMember = useCallback(() => {
        navigation.replace('ChatRoomInvite', { roomId })
    }, [navigation, roomId])
    return (
        <Header
            backButton
            headerRight={
                <>
                    <Pressable
                        onPress={handleInviteMember}
                        style={styles(theme).headerIconContainer}>
                        <SvgImage name="Plus" />
                    </Pressable>
                </>
            }
        />
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        headerIconContainer: {
            padding: theme.spacing.sm,
        },
    })

export default ChatRoomMembersHeader
