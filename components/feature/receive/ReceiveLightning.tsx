import { Button, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBridge } from '../../../contexts/FederationsContext'
import amountUtils from '../../../utils/AmountUtils'

type ReceiveLightningProps = {
    handleInvoice: Function
}

const ReceiveLightning: React.FC<ReceiveLightningProps> = ({
    handleInvoice,
}: ReceiveLightningProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [amount, setAmount] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [amountIsValid, setAmountIsValid] = useState(false)
    const { generateInvoice } = useBridge()

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
        try {
            setIsLoading(true)
            const newInvoice = await generateInvoice(
                amountUtils.stringToMillis(amount),
                'test memo',
            )
            handleInvoice(newInvoice)
            setIsLoading(false)
        } catch (error) {
            console.log(error)
        }
    }

    return (
        <View style={styles(theme).container}>
            <Text style={styles(theme).instructions}>
                {t('feature.receive.instructions')}
            </Text>
            <Input
                onChangeText={onChangeText}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <Button
                title={t('feature.receive.create-lightning-request')}
                onPress={onGenerateInvoice}
                disabled={!amountIsValid}
                loading={isLoading}
                fullWidth
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            width: '100%',
            alignItems: 'center',
        },
        instructions: {
            marginVertical: theme.spacing.md,
            fontSize: 14,
        },
        textInput: {
            width: '80%',
        },
    })

export default ReceiveLightning
