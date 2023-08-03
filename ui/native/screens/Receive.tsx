import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useMinMaxRequestAmount } from '@fedi/common/hooks/amount'
import amountUtils from '@fedi/common/utils/AmountUtils'

import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>

const Receive: React.FC<Props> = ({ navigation }: Props) => {
    const insets = useSafeAreaInsets()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { generateInvoice } = useBridge()
    const { minimumAmount, maximumAmount } = useMinMaxRequestAmount()
    const { toast } = useEnvironmentContext().state
    const [amount, setAmount] = useState<Sats>(0 as Sats)
    const [invoice, setInvoice] = useState<string>('')
    const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    // TODO integrate memo
    const [memo] = useState<string>('')

    useEffect(() => {
        const createNewInvoice = async () => {
            try {
                const newInvoice = await generateInvoice(
                    amountUtils.satToMsat(amount),
                    memo,
                )
                setInvoice(newInvoice)
            } catch (error) {
                toast?.show(t('errors.failed-to-generate-invoice'), 3000)
            }
        }
        if (generatingInvoice) {
            createNewInvoice()
        }
    }, [t, toast, amount, generateInvoice, generatingInvoice, memo])

    useEffect(() => {
        if (invoice) {
            setGeneratingInvoice(false)
            navigation.navigate('BitcoinRequest', {
                uri: `lightning:${invoice}`,
            })
        }
    }, [invoice, navigation])

    const onChangeAmount = (updatedValue: Sats) => {
        setSubmitAttempts(0)
        setAmount(updatedValue)
    }

    const handleSubmit = () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (amount > maximumAmount || amount < minimumAmount) {
            return
        }

        setGeneratingInvoice(true)
        Keyboard.dismiss()
    }

    return (
        <KeyboardAwareWrapper>
            <View style={styles(theme, insets).container}>
                <AmountInput
                    amount={amount}
                    onChangeAmount={onChangeAmount}
                    minimumAmount={minimumAmount}
                    maximumAmount={maximumAmount}
                    submitAttempts={submitAttempts}
                    verb={t('words.request')}
                />
                <Button
                    fullWidth
                    title={`${t('words.request')}${
                        amount ? ` ${amountUtils.formatSats(amount)} ` : ' '
                    }${t('words.sats').toUpperCase()}`}
                    onPress={handleSubmit}
                    loading={generatingInvoice}
                    containerStyle={styles(theme, insets).button}
                    titleProps={{
                        numberOfLines: 1,
                        adjustsFontSizeToFit: true,
                    }}
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
