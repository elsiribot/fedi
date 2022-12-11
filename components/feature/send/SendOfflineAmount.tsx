import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import type { RootStackParamList } from '../../../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const navigation = useNavigation()

    return (
        <View style={styles.container}>
            <Button
                title={'send offline'}
                onPress={() => {
                    navigation.navigate('SendOfflineQr', {
                        tokens: '<insert ecash tokens here>',
                    })
                }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

export default SendOfflineAmount
