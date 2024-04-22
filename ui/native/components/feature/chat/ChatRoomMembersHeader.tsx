import { useNavigation, useRoute } from '@react-navigation/native'
import React, { useCallback } from 'react'

import { ChatRoomMembersProps } from '../../../screens/ChatRoomMembers'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'

type ChatRoomMembersRouteProp = ChatRoomMembersProps['route']

const ChatRoomMembersHeader: React.FC = () => {
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

export default ChatRoomMembersHeader
