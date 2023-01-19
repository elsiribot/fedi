import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { FAB, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'

import RoomsList from '../components/feature/community/RoomsList'
import { FEDI_GENERAL_CHANNEL_ROOM } from '../constants'
import { useCommunityContext } from '../state/contexts/CommunityContext'
import { useXmpp } from '../state/hooks'
import {
    HomeTabsParamList,
    NavigationHook,
    RootStackParamList,
} from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Community'
>

const Community: React.FC<Props> = () => {
    const { theme } = useTheme()
    const navigation = useNavigation<NavigationHook>()
    const { enterMucRoom } = useXmpp()
    const { authenticatedMember } = useCommunityContext().state

    // This is a temporary measure to improve member discovery...
    // all users announce presence in this room even without clicking it
    // so that presence messages for each new user are sent to all other users
    useEffect(() => {
        if (authenticatedMember) {
            enterMucRoom(FEDI_GENERAL_CHANNEL_ROOM)
        }
    }, [authenticatedMember, enterMucRoom])

    return (
        <View style={styles(theme).container}>
            <RoomsList />

            <FAB
                icon={{ name: 'add', color: theme.colors.secondary }}
                color={theme.colors.primary}
                size="large"
                placement="right"
                onPress={() => {
                    navigation.navigate('NewMessage')
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
        },
    })

export default Community
