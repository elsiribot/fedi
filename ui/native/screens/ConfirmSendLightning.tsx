import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useOmniPaymentState } from '@fedi/common/hooks/pay'
import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { fedimint } from '../bridge'
import AmountInput from '../components/ui/AmountInput'
import KeyboardAwareWrapper from '../components/ui/KeyboardAwareWrapper'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const activeFederation = useAppSelector(selectActiveFederation)
    const { toast } = useEnvironmentContext().state
    const { parsedData } = route.params
    const {
        isReadyToPay,
        exactAmount,
        minimumAmount,
        maximumAmount,
        inputAmount,
        description,
        setInputAmount,
        handleOmniInput,
        handleOmniSend,
    } = useOmniPaymentState(fedimint, activeFederation?.id)

    useEffect(() => {
        handleOmniInput(parsedData)
    }, [handleOmniInput, parsedData])

    const [unit] = useState('sats')
    const [isPayingInvoice, setIsPayingInvoice] = useState<boolean>(false)
    const [submitAttempts, setSubmitAttempts] = useState(0)

    const navigationReplace = navigation.replace
    const handleSend = useCallback(async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) return

        setIsPayingInvoice(true)
        try {
            await handleOmniSend(inputAmount)
            navigationReplace('SendSuccess', {
                amount: amountUtils.satToMsat(inputAmount),
                unit,
            })
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
        setIsPayingInvoice(false)
    }, [
        handleOmniSend,
        inputAmount,
        minimumAmount,
        maximumAmount,
        unit,
        navigationReplace,
        toast,
        t,
    ])

    if (!isReadyToPay) return <ActivityIndicator />

    return (
        <KeyboardAwareWrapper>
            <View style={styles(theme).container}>
                <Text caption>
                    {`${t('words.balance')}: `}
                    {`${amountUtils.formatNumber(
                        amountUtils.msatToSat(activeFederation?.balance!),
                    )} `}
                    {`${t('words.sats').toUpperCase()}`}
                </Text>
                <View style={styles(theme).detailsContainer}>
                    <AmountInput
                        amount={inputAmount}
                        onChangeAmount={setInputAmount}
                        minimumAmount={minimumAmount}
                        maximumAmount={maximumAmount}
                        submitAttempts={submitAttempts}
                        readOnly={!!exactAmount}
                    />
                    {description && (
                        <Text caption style={styles(theme).description}>
                            {description}
                        </Text>
                    )}
                </View>
                <View style={styles(theme).buttonContainer}>
                    <Button
                        title={`${t('words.send')}${
                            inputAmount
                                ? ` ${amountUtils.formatNumber(inputAmount)} `
                                : ' '
                        }${t('words.sats').toUpperCase()}`}
                        onPress={handleSend}
                        loading={isPayingInvoice}
                        disabled={isPayingInvoice}
                        fullWidth
                    />
                </View>
            </View>
        </KeyboardAwareWrapper>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: theme.spacing.xl,
        },
        detailsContainer: {
            alignItems: 'center',
            paddingVertical: theme.spacing.xl,
        },
        description: {
            paddingTop: theme.spacing.lg,
            textAlign: 'center',
            color: theme.colors.darkGrey,
        },
        buttonContainer: {
            width: '90%',
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            margin: theme.spacing.md,
        },
    })

export default ConfirmSendLightning
