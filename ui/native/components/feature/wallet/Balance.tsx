import type { Theme } from '@rneui/themed'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useBalance } from '@fedi/common/hooks/amount'

const Balance: React.FC = () => {
    const { theme } = useTheme()
    const { formattedBalanceSats, formattedBalanceFiat } = useBalance()
    const maxFontSizeMultiplier = 1.8

    return (
        <View style={styles(theme).container}>
            <Text
                h2
                medium
                style={[styles(theme).balanceText, styles(theme).topText]}
                maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {`${formattedBalanceFiat}`}
            </Text>
            <Text
                caption
                medium
                style={styles(theme).balanceText}
                maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {`${formattedBalanceSats}`}
            </Text>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            minHeight: 60,
        },
        balanceText: {
            textAlign: 'center',
            color: theme.colors.secondary,
            marginBottom: theme.spacing.xs,
        },
        topText: {
            lineHeight: 32,
        },
    })

export default Balance
