import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import {
    selectBtcExchangeRate,
    selectCurrency,
    selectShowFiatTxnAmounts,
} from '@fedi/common/redux'
import { MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { useAppSelector } from '../../state/hooks'

export interface HistoryRowProps {
    icon: React.ReactNode
    status: React.ReactNode
    notes: React.ReactNode
    amount: MSats | string
    timestamp: number | undefined | null
    direction?: 'incoming' | 'outgoing'
    onSelect: () => void
}

export const HistoryRow: React.FC<HistoryRowProps> = ({
    icon,
    status,
    notes,
    amount,
    timestamp,
    direction,
    onSelect,
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const currency = useAppSelector(selectCurrency)
    const btcExchangeRate = useAppSelector(selectBtcExchangeRate)
    const showFiatTxnAmounts = useAppSelector(selectShowFiatTxnAmounts)

    const style = styles(theme)

    let amountNode: React.ReactNode
    const sign = direction ? (direction === 'outgoing' ? `-` : `+`) : ''
    if (typeof amount === 'number') {
        let formattedAmount: string
        let currencyText: string
        if (showFiatTxnAmounts) {
            const fiatAmount = amountUtils.msatToFiat(amount, btcExchangeRate)
            formattedAmount = amountUtils.formatFiat(fiatAmount, currency, {
                noSymbol: true,
            })
            currencyText = currency
        } else {
            formattedAmount = amountUtils.formatNumber(
                amountUtils.msatToSat(amount),
            )
            currencyText = t('words.sats').toUpperCase()
        }
        amountNode = (
            <View style={style.amountContainer}>
                <Text caption medium>
                    {sign}
                    {formattedAmount}
                </Text>
                <Text tiny medium style={style.amountSuffix}>
                    {currencyText}
                </Text>
            </View>
        )
    } else {
        amountNode = (
            <View style={style.amountContainer}>
                <Text caption medium>
                    {sign}
                    {amount}
                </Text>
            </View>
        )
    }

    return (
        <TouchableOpacity
            onPress={() => onSelect()}
            style={[style.container]}
            hitSlop={4}>
            {icon}
            <View style={style.centerContainer}>
                <Text caption medium>
                    {status}
                </Text>
                {notes && (
                    <Text small numberOfLines={1} style={style.subText}>
                        {notes}
                    </Text>
                )}
            </View>

            <View style={style.rightContainer}>
                {amountNode}
                {timestamp && (
                    <Text small style={[style.rightAlignedText, style.subText]}>
                        {dateUtils.formatTxnTileTimestamp(timestamp)}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            backgroundColor: theme.colors.secondary,
            marginBottom: theme.spacing.xl,
        },
        centerContainer: {
            flex: 1,
            width: '100%',
            flexDirection: 'column',
            gap: 4,
        },
        rightContainer: {
            flexShrink: 0,
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 4,
        },
        rightAlignedText: {
            textAlign: 'right',
        },
        subText: {
            color: theme.colors.primaryLight,
        },
        pending: {
            opacity: 0.6,
        },
        amountContainer: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'flex-end',
            gap: 2,
        },
        amountSuffix: {
            paddingBottom: 1,
        },
    })
