import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator } from 'react-native'

import { useOmniPaymentState } from '@fedi/common/hooks/pay'
import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { fedimint } from '../bridge'
import { AmountScreen } from '../components/ui/AmountScreen'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector } from '../state/hooks'
import { NavigationHook, RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ConfirmSendLightning'
>

const ConfirmSendLightning: React.FC<Props> = ({ route }: Props) => {
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { toast } = useEnvironmentContext().state
    const activeFederation = useAppSelector(selectActiveFederation)
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
        <AmountScreen
            showBalance
            amount={inputAmount}
            onChangeAmount={setInputAmount}
            minimumAmount={minimumAmount}
            maximumAmount={maximumAmount}
            submitAttempts={submitAttempts}
            readOnly={!!exactAmount}
            description={description}
            buttons={[
                {
                    title: `${t('words.send')}${
                        inputAmount
                            ? ` ${amountUtils.formatNumber(inputAmount)} `
                            : ' '
                    }${t('words.sats').toUpperCase()}`,
                    onPress: handleSend,
                    loading: isPayingInvoice,
                    disabled: isPayingInvoice,
                },
            ]}
        />
    )
}

export default ConfirmSendLightning
