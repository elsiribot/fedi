import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { useNavigation } from '@react-navigation/native'
import { FAB, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import RoomsList from '../components/feature/community/RoomsList'
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
    const { dispatch } = useFederationsContext()
    const { sendMessage } = useXmpp()
    const navigation = useNavigation<NavigationHook>()

    return (
        <View style={styles(theme).container}>
            <RoomsList />
            <FAB
                icon={{ name: 'add', color: theme.colors.secondary }}
                color={theme.colors.primary}
                size="large"
                placement="right"
                onPress={() => {
                    navigation.navigate('JoinRoom')
                }}
            />
            {/* <Button
                type="clear"
                onPress={() => {
                    sendMessage({
                        text: 'this is a test message',
                        toUser: 'oz-iphone@xmpp.dev.fedibtc.com/community',
                    })
                }}
                title="DEV: Send test message"
            />
            <Button
                onPress={() => {
                    dispatch(resetFederationUsername())
                }}
                title="DEV: Reset username"
            /> */}
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: theme.spacing.xl,
        },
    })

export default Community
