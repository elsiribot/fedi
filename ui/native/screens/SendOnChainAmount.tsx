import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Input, Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { useBalanceDisplay } from '@fedi/common/hooks/amount'
import { useOmniPaymentState } from '@fedi/common/hooks/pay'
import { FeeItem } from '@fedi/common/hooks/transactions'
import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import stringUtils from '@fedi/common/utils/StringUtils'
import { hexToRgba } from '@fedi/common/utils/color'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'

import { fedimint } from '../bridge'
import { FeeBreakdown } from '../components/feature/send/FeeBreakdown'
import FiatAmount from '../components/feature/wallet/FiatAmount'
import { AmountScreen } from '../components/ui/AmountScreen'
import LineBreak from '../components/ui/LineBreak'
import SvgImage from '../components/ui/SvgImage'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { Btc, ParserDataType, Sats, SatsString } from '../types'
import type { NavigationHook, RootStackParamList } from '../types/navigation'
import ConfirmSendLightning from './ConfirmSendLightning'

const log = makeLog('SendOnChainAmount')

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SendOnChainAmount'
>

const SendOnChainAmount: React.FC<Props> = ({ route }: Props) => {
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const { t } = useTranslation()
    const navigation = useNavigation<NavigationHook>()
    const { toast } = useEnvironmentContext().state
    const activeFederation = useAppSelector(selectActiveFederation)
    const { parsedData } = route.params

    const {
        isReadyToPay,
        minimumAmount,
        maximumAmount,
        inputAmount,
        setInputAmount,
        handleOmniInput,
        handleOmniSend,
    } = useOmniPaymentState(fedimint, activeFederation?.id)

    useEffect(() => {
        handleOmniInput(parsedData)
    }, [handleOmniInput, parsedData])

    const [submitAttempts, setSubmitAttempts] = useState(0)

    const navigationPush = navigation.push
    const handleContinue = useCallback(async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) return

        try {
            navigationPush('ConfirmSendOnChain', {
                parsedData: {
                    type: ParserDataType.Bip21,
                    data: {
                        address: parsedData.data.address,
                        amount: amountUtils.satToBtc(inputAmount),
                    },
                },
            })
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
    }, [
        handleOmniSend,
        inputAmount,
        minimumAmount,
        maximumAmount,
        navigationPush,
        parsedData.data.address,
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
            buttons={[
                {
                    title: t('words.continue'),
                    onPress: handleContinue,
                },
            ]}
        />
    )
}

export default SendOnChainAmount
