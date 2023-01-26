import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { FAB, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import ChatsList from '../components/feature/community/ChatsList'

import { FEDI_GENERAL_CHANNEL_GROUP } from '../constants'
import { useCommunityContext } from '../state/contexts/CommunityContext'
import { useFederationsContext } from '../state/contexts/FederationsContext'
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
    const { enterMucRoom, fetchMessagesFromArchive } = useXmpp()
    const { selectedFederation } = useFederationsContext().state
    const { authenticatedMember } = useCommunityContext().state

    useEffect(() => {
        if (authenticatedMember) {
            // This is a temporary measure to improve member discovery...
            // all users announce presence in this MUC room even without clicking it
            // so that presence messages for each new user are sent to all other users
            enterMucRoom(FEDI_GENERAL_CHANNEL_GROUP)
            // Here we fetch any messages we may have missed while offline
            // TODO: only fetch messages from after the last received timestamp
            fetchMessagesFromArchive({ filters: null })
        }
    }, [authenticatedMember, enterMucRoom, fetchMessagesFromArchive])

    return (
        <View style={styles(theme).container}>
            <ChatsList />

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
