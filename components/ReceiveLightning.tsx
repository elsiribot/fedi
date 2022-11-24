import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NativeModules, StyleSheet, View } from 'react-native'
import { Button, Input, Text } from '@rneui/themed'

const {
    FedimintFfi: { generateInvoice },
} = NativeModules

type ReceiveLightningProps = {
    handleInvoice: Function
}

const ReceiveLightning: React.FC<ReceiveLightningProps> = ({
    handleInvoice,
}: ReceiveLightningProps) => {
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
        handleInvoice(newInvoice)
    }

    return (
        <View style={styles.container}>
            <Text style={styles.instructions}>
                {t('feature.receive.instructions')}
            </Text>
            <Input
                onChangeText={onChangeText}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles.textInput}
            />
            <Button
                title={t('feature.receive.create-lightning-request')}
                onPress={onGenerateInvoice}
                disabled={!amountIsValid}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
    },
    instructions: {
        marginTop: 16,
        marginBottom: 16,
        fontSize: 14,
    },
    textInput: {
        width: '80%',
    },
})

export default ReceiveLightning
