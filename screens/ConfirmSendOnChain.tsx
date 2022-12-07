import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TextInput, View } from 'react-native'
import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendOnChain'
>

const ConfirmSendOnChain: React.FC<Props> = ({ navigation, route }: Props) => {
    const { t } = useTranslation()
    const { payAddress } = useBridge()
    const { address } = route.params
    const [amount, setAmount] = useState<string>('')

    const onSendBtc = async () => {
        try {
            console.log('paying address', address, amount)
            await payAddress(address, amount)
            console.log('paid')
            navigation.navigate('Home')
        } catch (error) {
            console.error(error)
        }
    }

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    return (
        <View style={styles.container}>
            <View style={styles.detailsContainer}>
                <Text style={styles.address}>{address}</Text>
                <TextInput
                    onChangeText={onChangeText}
                    value={amount}
                    placeholder={`${t('words.amount')} (${t('words.sats')})`}
                    keyboardType="numeric"
                    returnKeyType="done"
                />
                <View style={styles.buttonContainer}>
                    <Button title={t('words.send')} onPress={onSendBtc} />
                </View>
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

export default ConfirmSendOnChain
