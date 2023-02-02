import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import UsdAmount from '../components/feature/wallet/UsdAmount'
import { MAX_INVOICE_AMOUNT_SATS } from '../constants'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import { Sats, SatsString } from '../types'
import type { RootStackParamList } from '../types/navigation'
import amountUtils from '../utils/AmountUtils'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateInvoice } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [amount, setAmount] = useState<SatsString | string>('')
    const [amountIsValid, setAmountIsValid] = useState<boolean>(false)
    const [invoice, setInvoice] = useState<string>('')
    const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false)
    // TODO integrate memo
    const [memo] = useState<string>('')

    useEffect(() => {
        const isNumeric = /^-?\d+$/.test(amount)

        if (
            amount === '' ||
            amount === '0' ||
            isNumeric === false ||
            Number(amount) > MAX_INVOICE_AMOUNT_SATS
        ) {
            setAmountIsValid(false)
        } else {
            setAmountIsValid(true)
        }
    }, [amount])

    useEffect(() => {
        const createNewInvoice = async () => {
            try {
                const newInvoice = await generateInvoice(
                    amountUtils.satToMsat(Number(amount) as Sats),
                    memo,
                )
                setInvoice(newInvoice)
            } catch (error) {
                toast?.show('Failed to generate invoice', 3000)
            }
        }
        if (generatingInvoice) {
            createNewInvoice()
        }
    }, [toast, amount, generateInvoice, generatingInvoice, memo])

    useEffect(() => {
        if (invoice) {
            setGeneratingInvoice(false)
            navigation.navigate('BitcoinRequest', {
                uri: `lightning:${invoice}`,
            })
        }
    }, [invoice, navigation])

    const onChangeText = (updatedValue: SatsString) => {
        if (Number(updatedValue) > MAX_INVOICE_AMOUNT_SATS) {
            toast?.show(t('feature.receive.maximum-invoice-amount'), 3000)
        } else {
            toast?.close(0)
        }
        setAmount(updatedValue)
    }

    return (
        <View style={styles(theme).container}>
            <Input
                autoFocus
                onChangeText={onChangeText as (_: string) => any}
                value={amount}
                placeholder={`${t('words.amount')} (${t('words.sats')})`}
                keyboardType="numeric"
                returnKeyType="done"
                containerStyle={styles(theme).textInput}
            />
            <UsdAmount amountSats={Number(amount) as Sats} />
            <Button
                fullWidth
                title={`${t('words.request')}${
                    amount
                        ? ` ${amountUtils.formatNumber(Number(amount))} `
                        : ' '
                }${t('words.sats').toUpperCase()}`}
                onPress={() => setGeneratingInvoice(true)}
                disabled={!amountIsValid || generatingInvoice}
                loading={generatingInvoice}
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
