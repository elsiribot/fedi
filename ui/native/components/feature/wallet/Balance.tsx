import type { Theme } from '@rneui/themed'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useBalance } from '@fedi/common/hooks/amount'

import { MSats } from '../../../types'

export type Props = {
    balance: MSats | null
}

const Balance: React.FC<Props> = ({ balance }: Props) => {
    const { theme } = useTheme()
    const { satsBalanceWithSymbol, fiatBalanceWithSymbol } = useBalance()

    if (balance !== null) {
        return (
            <View style={styles(theme).container}>
                <Text
                    h2
                    medium
                    style={[styles(theme).balanceText, styles(theme).topText]}>
                    {`${fiatBalanceWithSymbol}`}
                </Text>
                <Text caption medium style={styles(theme).balanceText}>
                    {`${satsBalanceWithSymbol}`}
                </Text>
            </View>
        )
    } else {
        return <ActivityIndicator />
    }
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
