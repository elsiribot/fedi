import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { Pressable } from 'react-native'

import { NavigationHook, RootStackParamList } from '../../../types/navigation'
import Header from '../../ui/Header'
import SvgImage from '../../ui/SvgImage'

type ChatRouteProp = RouteProp<RootStackParamList, 'ChatRoomInvite'>

const ChatRoomInviteHeader: React.FC = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const route = useRoute<ChatRouteProp>()

    return (
        <Header
            backButton
            headerRight={
                <Pressable
                    style={{ padding: theme.spacing.sm }}
                    onPress={() => {
                        navigation.navigate('ScanMemberCode', {
                            inviteToRoomId: route.params.roomId,
                        })
                    }}>
                    <SvgImage name={'Scan'} />
                </Pressable>
            }
        />
    )
}

export default ChatRoomInviteHeader
