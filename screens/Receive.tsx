import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBridge } from '../state/hooks'
import { Sats, SatsString } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [amount, setAmount] = useState<SatsString | string>('')
    // TODO integrate memo
    const [memo] = useState<string>('')
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

    const onChangeText = (updatedValue: SatsString) => {
        setAmount(updatedValue)
    }

    const createAndShowInvoice = async () => {
        try {
            setIsLoading(true)
            const newInvoice = await generateInvoice(
                amountUtils.satToMsat(Number(amount) as Sats),
                memo,
            )
            navigation.navigate('BitcoinRequest', {
                uri: `lightning:${newInvoice}`,
            })
        } catch (error) {
            console.log(error)
        }
        setIsLoading(false)
    }

    return (
        <View style={styles(theme).container}>
            <Input
                onChangeText={onChangeText as (_: string) => any}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <Button
                fullWidth
                title={`${t('words.request')}${amount ? ` ${amount} ` : ' '}${t(
                    'words.sats',
                ).toUpperCase()}`}
                onPress={createAndShowInvoice}
                disabled={!amountIsValid}
                loading={isLoading}
                containerStyle={styles(theme).button}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        button: {
            marginTop: 'auto',
        },
        textInput: {
            width: '80%',
            marginTop: 'auto',
        },
    })

export default Receive
