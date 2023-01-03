import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import { Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import RoomsList from '../components/feature/community/RoomsList'
import { HomeTabsParamList, RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Community'
>

const Community: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()

    return (
        <View style={styles(theme).container}>
            <RoomsList />
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
