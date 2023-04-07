import type { Theme } from '@rneui/themed'
import { Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import amountUtils from '@fedi/common/utils/AmountUtils'

import { useBtcUsdPrice } from '../../../state/hooks'
import { MSats } from '../../../types'

export type Props = {
    balance: MSats | null
}

const Balance: React.FC<Props> = ({ balance }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { convertSatsToUsdString } = useBtcUsdPrice()

    if (balance !== null) {
        const amountInSats = amountUtils.msatToSat(balance)
        return (
            <View>
                <Text h2 medium style={styles(theme).balanceText}>
                    {`$${convertSatsToUsdString(amountInSats)}`}
                </Text>
                <Text caption medium style={styles(theme).balanceText}>
                    {`${amountUtils.formatNumber(amountInSats)} ${t(
                        'words.sats',
                    ).toUpperCase()}`}
                </Text>
            </View>
        )
    } else {
        return <ActivityIndicator />
    }
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        balanceText: {
            textAlign: 'center',
            color: theme.colors.secondary,
            marginBottom: theme.spacing.xs,
        },
    })

export default Balance
