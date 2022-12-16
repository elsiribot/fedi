import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { WebView } from 'react-native-webview'

import type { RootStackParamList } from '../types/navigation'

export type Props = BottomTabScreenProps<RootStackParamList, 'Webview'>

const Webview: React.FC<Props> = ({ route }) => {
    const { url } = route.params
    return (
        <View style={styles.container}>
            <WebView source={{ uri: url }} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // justifyContent: 'space-evenly',
        // alignItems: 'center',
        paddingHorizontal: 24,
    },
})

export default Webview
