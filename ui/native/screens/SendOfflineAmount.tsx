import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Keyboard } from 'react-native'

import { useMinMaxSendAmount } from '@fedi/common/hooks/amount'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { AmountScreen } from '../components/ui/AmountScreen'
import { useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOfflineAmount'
>

const SendOfflineAmount: React.FC<Props> = () => {
    const navigation = useNavigation()
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [amount, setAmount] = useState(0 as Sats)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const { generateEcash } = useBridge()
    const { minimumAmount, maximumAmount } = useMinMaxSendAmount()

    const onGenerateEcash = async () => {
        try {
            setIsLoading(true)
            const millis = amountUtils.satToMsat(Number(amount) as Sats)
            const ecash = await generateEcash(millis)
            setIsLoading(false)
            navigation.navigate('SendOfflineQr', { ecash, amount: millis })
        } catch (error) {
            console.error(error)
            setIsLoading(false)
        }
    }

    const continueSend = () => {
        Keyboard.dismiss()
        onGenerateEcash()
    }

    const onNext = () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (amount < minimumAmount || amount > maximumAmount) {
            return
        }

        Alert.alert(
            t('phrases.please-confirm'),
            t('feature.send.offline-send-warning'),
            [
                {
                    text: t('phrases.go-back'),
                },
                {
                    text: t('words.continue'),
                    onPress: continueSend,
                },
            ],
        )
    }

    const onChangeAmount = (updatedValue: Sats) => {
        setSubmitAttempts(0)
        setAmount(updatedValue)
    }

    return (
        <AmountScreen
            showBalance
            amount={amount}
            onChangeAmount={onChangeAmount}
            minimumAmount={minimumAmount}
            maximumAmount={maximumAmount}
            submitAttempts={submitAttempts}
            verb={t('words.send')}
            buttons={[
                {
                    title: t('words.next'),
                    onPress: onNext,
                    disabled: isLoading,
                    loading: isLoading,
                },
            ]}
        />
    )
}

export default SendOfflineAmount
