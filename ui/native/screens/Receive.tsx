import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { selectMaxReceiveAmount } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateInvoice } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [amount, setAmount] = useState<Sats>(0 as Sats)
    const [amountIsValid, setAmountIsValid] = useState<boolean>(false)
    const [invoice, setInvoice] = useState<string>('')
    const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false)
    const maxReceiveAmount = useAppSelector(selectMaxReceiveAmount)
    // TODO integrate memo
    const [memo] = useState<string>('')

    useEffect(() => {
        if (amount === 0) {
            setAmountIsValid(false)
        } else if (maxReceiveAmount && amount > maxReceiveAmount) {
            setAmountIsValid(false)
        } else {
            setAmountIsValid(true)
        }
    }, [amount, maxReceiveAmount])

    useEffect(() => {
        const createNewInvoice = async () => {
            try {
                const newInvoice = await generateInvoice(
                    amountUtils.satToMsat(amount),
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

    const onChangeAmount = (updatedValue: Sats) => {
        if (maxReceiveAmount && updatedValue > maxReceiveAmount) {
            toast?.show(
                t('feature.receive.maximum-invoice-amount', {
                    maxAmount: amountUtils.formatSats(maxReceiveAmount as Sats),
                }),
                3000,
            )
        } else {
            toast?.close(0)
        }

        setAmount(updatedValue)
    }

    return (
        <KeyboardAwareWrapper>
            <View style={styles(theme, insets).container}>
                <AmountInput amount={amount} onChangeAmount={onChangeAmount} />
                <Button
                    fullWidth
                    title={`${t('words.request')}${
                        amount ? ` ${amountUtils.formatSats(amount)} ` : ' '
                    }${t('words.sats').toUpperCase()}`}
                    onPress={() => {
                        setGeneratingInvoice(true)
                        Keyboard.dismiss()
                    }}
                    disabled={!amountIsValid || generatingInvoice}
                    loading={generatingInvoice}
                    containerStyle={styles(theme, insets).button}
                />
            </View>
        </KeyboardAwareWrapper>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            padding: theme.spacing.xl,
            paddingBottom: theme.spacing.xl + insets.bottom,
            width: '100%',
        },
        button: {
            marginTop: 'auto',
        },
    })

export default Receive
