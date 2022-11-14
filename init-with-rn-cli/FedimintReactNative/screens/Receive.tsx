import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Button,
    NativeModules,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

import type { RootStackParamList } from '../App'

const {
    FedimintFfi: { generateInvoice },
} = NativeModules

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [amount, setAmount] = useState<string>('')
    const [amountIsValid, setAmountIsValid] = useState(false)

    useEffect(() => {
        const isNumeric = /^-?\d+$/.test(amount)

        if (amount === '' || amount === '0' || isNumeric === false) {
            setAmountIsValid(false)
        } else {
            setAmountIsValid(true)
        }
    }, [amount])

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    const onGenerateInvoice = async () => {
        // call fedimint-ffi to generate invoice
        const newInvoice = await generateInvoice(amount, 'test memo')
        console.log(`generateInvoice: ', ${newInvoice})`)
        navigation.navigate('LnInvoice', {
            invoice: newInvoice,
        })
    }

    return (
        <View style={styles.container}>
            <Text>{t('feature.receive.instructions')}</Text>
            <TextInput
                onChangeText={onChangeText}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
            />
            <Button
                title={t('phrases.generate-invoice')}
                onPress={onGenerateInvoice}
                disabled={!amountIsValid}
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

export default Receive
