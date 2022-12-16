import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Button } from '@rneui/themed'

import type { HomeTabsParamList, RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<
    HomeTabsParamList & RootStackParamList,
    'Sites'
>

const Sites: React.FC<Props> = ({ navigation }) => {
    const onTest = () => {
        navigation.navigate('Webview', { url: 'https://testfed.xyz/webln' })
    }
    return (
        <View style={styles.container}>
            <Button title={'WeblnTest'} onPress={onTest} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
})

export default Sites
