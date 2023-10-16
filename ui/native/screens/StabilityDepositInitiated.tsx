import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme } from '@rneui/themed'
import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useBtcFiatPrice } from '@fedi/common/hooks/amount'

import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityDepositInitiated'
>

const StabilityDepositInitiated: React.FC<Props> = ({ route }) => {
    const { theme } = useTheme()
    const { amount } = route.params
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const formattedFiat = convertSatsToFormattedFiat(amount)

    const style = styles(theme)

    return (
        <View style={style.container}>
            <View style={style.amountText}>
                <Text h1 numberOfLines={1}>
                    {formattedFiat}
                </Text>
            </View>
        </View>
    )
}

const styles = (_theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
        },
        amountText: {},
    })

export default StabilityDepositInitiated
