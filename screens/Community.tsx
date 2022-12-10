import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Theme, useTheme } from '@rneui/themed'

import type { HomeTabsParamList } from './Home'
import type { RootStackParamList } from '../Router'
import RoomsList from '../components/feature/community/RoomsList'

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
            paddingHorizontal: 24,
        },
    })

export default Community
