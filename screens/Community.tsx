import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Button, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import RoomsList from '../components/feature/community/RoomsList'
import {
    resetFederationUsername,
    useFederationsContext,
} from '../state/contexts/FederationsContext'
import { useXmpp } from '../state/hooks'
import { HomeTabsParamList, RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Community'
>

const Community: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { dispatch } = useFederationsContext()
    const { sendMessage } = useXmpp()

    return (
        <View style={styles(theme).container}>
            <RoomsList />
            <Button
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
            />
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
