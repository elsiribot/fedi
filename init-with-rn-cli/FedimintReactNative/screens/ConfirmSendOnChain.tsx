import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSend: React.FC<Props> = ({ route }: Props) => {
    const { address } = route.params

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Text style={styles.address}>{address}</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    detailsContainer: {
        height: '50%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContainer: {
        width: '90%',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        margin: 10,
    },
    text: {
        fontSize: 30,
        margin: 10,
    },
    address: {
        color: 'white',
    },
})

export default ConfirmSend
