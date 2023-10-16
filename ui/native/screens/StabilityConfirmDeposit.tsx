import { useNavigation } from '@react-navigation/native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import { Button } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'
import { increaseStableBalance } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { fedimint } from '../bridge'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppDispatch } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityConfirmDeposit'
>

const StabilityConfirmDeposit: React.FC<Props> = ({ route }) => {
    const { theme } = useTheme()
    const navigation = useNavigation()
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const { amount } = route.params
    const { toast } = useEnvironmentContext().state
    const [processingDeposit, setProcessingDeposit] = useState<boolean>(false)
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const formattedFiat = convertSatsToFormattedFiat(amount)

    const handleSubmit = async () => {
        try {
            setProcessingDeposit(true)
            const amountToDeposit = amountUtils.satToMsat(amount)
            await dispatch(
                increaseStableBalance({
                    fedimint,
                    amount: amountToDeposit,
                }),
            ).unwrap()
            navigation.navigate('StabilityDepositInitiated', {
                amount,
            })
        } catch (error) {
            toast?.show(t('errors.unknown-error'))
        }
    }

    const style = styles(theme)

    return (
        <View style={style.container}>
            <View style={style.amountText}>
                <Text h1 numberOfLines={1}>
                    {formattedFiat}
                </Text>
            </View>
            <Button
                containerStyle={[style.button]}
                onPress={handleSubmit}
                disabled={processingDeposit}
                title={
                    <Text medium caption style={style.buttonText}>
                        {t('words.deposit')}
                    </Text>
                }
            />
        </View>
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
        },
        amountText: {},
        button: {},
        buttonText: {},
    })

export default StabilityConfirmDeposit
