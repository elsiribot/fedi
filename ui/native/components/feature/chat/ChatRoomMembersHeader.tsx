import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'

import { ChatRoomMembersProps } from '../../../screens/ChatRoomMembers'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { Pressable } from '../../ui/Pressable'
import { PressableIcon } from '../../ui/PressableIcon'
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
                    <PressableIcon
                        onPress={handleInviteMember}
                        svgName="Plus"
                    />
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
