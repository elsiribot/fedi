import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, NativeModules, Text, TextInput, View } from 'react-native'
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
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Enter how much you want to receive`}</Text>
            <TextInput
                onChangeText={onChangeText}
                value={amount}
                placeholder="Amount (sats)"
                keyboardType="numeric"
                returnKeyType="done"
            />
            <Button
                title="Generate Invoice"
                onPress={onGenerateInvoice}
                disabled={!amountIsValid}
            />
        </View>
    )
}

export default Receive
