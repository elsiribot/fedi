import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'

import { ChatRoomMembersProps } from '../../../screens/ChatRoomMembers'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'

type ChatRoomMembersRouteProp = ChatRoomMembersProps['route']

const ChatRoomMembersHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<ChatRoomMembersRouteProp>()
    const { roomId } = route.params
    const handleInviteMember = useCallback(() => {
        navigation.replace('ChatRoomInvite', { roomId })
    }, [navigation, roomId])
    const style = styles(theme)
    return (
        <Header
            backButton
            headerRight={
                <>
                    <PressableIcon
                        onPress={handleInviteMember}
                        svgName="Plus"
                        hitSlop={5}
                    />
                </>
            }
            rightContainerStyle={style.rightContainer}
        />
    )
}
const styles = (theme: Theme) =>
    StyleSheet.create({
        rightContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingVertical: theme.spacing.sm,
        },
    })

export default ChatRoomMembersHeader
