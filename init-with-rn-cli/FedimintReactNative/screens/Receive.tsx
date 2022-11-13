import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button, TextInput } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [amount, setAmount] = useState<string>('')
    const [invoice, setInvoice] = useState('')

    const onChangeText = (updatedValue: string) => {
        setAmount(updatedValue)
    }

    const generateInvoice = () => {
        // call fedimint-ffi to generate invoice
        // const newInvoice = callFedimintFfi('createinvoice', amount)
        console.log(`callFedimintFfi('createinvoice', ${amount})`)
        // setInvoice(newInvoice)
    }

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Amount`}</Text>
            <TextInput
                onChangeText={onChangeText}
                value={amount}
                placeholder="Enter an amount in sats"
                keyboardType="numeric"
            />
            <Text>{invoice}</Text>
            <Button title="Generate Invoice" onPress={generateInvoice} />
        </View>
    )
}

export default Receive
