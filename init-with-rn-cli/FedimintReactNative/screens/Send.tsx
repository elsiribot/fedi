import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, Text, Button, TextInput } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [invoice, setInvoice] = React.useState('')

    const payInvoice = () => {
        // call fedimint-ffi here
        // const result = callFedimintFfi('payinvoice', invoice)
        console.log(`callFedimintFfi('payinvoice', ${invoice})`)
    }

    return (
        <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text>{`Paste LN invoice`}</Text>
            <TextInput onChangeText={setInvoice} value={invoice} />
            <Button title="Pay" onPress={payInvoice} />
        </View>
    )
}

export default Send
