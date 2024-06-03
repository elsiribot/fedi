import { useNavigation, useRoute } from '@react-navigation/native'
import { Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { StyleSheet } from 'react-native'

import {
    selectMatrixAuth,
    selectMatrixRoomMembersByMe,
} from '@fedi/common/redux'

import { ChatRoomMembersProps } from '../../../screens/ChatRoomMembers'
import { useAppSelector } from '../../../state/hooks'
import { MatrixPowerLevel } from '../../../types'
import { NavigationHook } from '../../../types/navigation'
import Header from '../../ui/Header'
import { PressableIcon } from '../../ui/PressableIcon'

type ChatRoomMembersRouteProp = ChatRoomMembersProps['route']

const ChatRoomMembersHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<ChatRoomMembersRouteProp>()
    const { roomId } = route.params

    const myUserId = useAppSelector(selectMatrixAuth)?.userId
    const members = useAppSelector(s => selectMatrixRoomMembersByMe(s, roomId))
    const me = members.find(m => m.id === myUserId)

    const handleInviteMember = useCallback(() => {
        if (me?.powerLevel === MatrixPowerLevel.Member) return

        navigation.replace('ChatRoomInvite', { roomId })
    }, [navigation, roomId, me])
    const style = styles(theme)

    return (
        <Header
            backButton
            headerRight={
                <PressableIcon
                    onPress={handleInviteMember}
                    svgName="Plus"
                    hitSlop={5}
                    disabled={me?.powerLevel === MatrixPowerLevel.Member}
                />
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
