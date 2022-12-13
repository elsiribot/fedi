import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../Router'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const [amount, setAmount] = useState<string>('')
    const { generateEcash } = useBridge()

    const onGenerateEcash = async () => {
        try {
            const millis = amountUtils.stringToMillis(amount)
            const ecash = await generateEcash(millis)
            navigation.navigate('SendOfflineQr', { ecash, amount: millis })
        } catch (error) {
            console.log(error)
        }
    }

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    return (
        <View style={styles.container}>
            <Input
                onChangeText={onChangeText}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles.textInput}
            />
            <Button title={'send offline'} onPress={onGenerateEcash} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textInput: {
        width: '80%',
    },
})

export default SendOfflineAmount
