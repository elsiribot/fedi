import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'
import { makeTxnStatusText } from '@fedi/common/utils/wallet'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type TransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}

const TransactionTile = ({ txn, selectTransaction }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    const renderAmount = () => {
        if (txn.bitcoin && txn.amount === 0)
            return t('words.onchain').toLowerCase()

        const formattedAmount = amountUtils.formatNumber(
            amountUtils.msatToSat(txn.amount),
        )
        const sign = txn.direction === TransactionDirection.send ? `-` : `+`

        return `${sign}${formattedAmount} ${t('words.sats').toUpperCase()}`
    }

    const style = styles(theme)

    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[
                style.container,
                txn.bitcoin &&
                txn.onchainState?.type === 'waitingForTransaction'
                    ? style.pending
                    : {},
            ]}>
            <View style={style.leftContainer}>
                <SvgImage
                    name="BitcoinCircle"
                    color={theme.colors.orange}
                    size={SvgImageSize.md}
                />
            </View>
            <View style={style.centerContainer}>
                <Text>{makeTxnStatusText(t, txn)}</Text>
                {txn.notes && (
                    <Text small numberOfLines={1}>
                        {txn.notes}
                    </Text>
                )}
            </View>

            <View style={style.rightContainer}>
                <Text style={style.rightAlignedText}>{renderAmount()}</Text>
                <Text small style={[style.rightAlignedText, style.subText]}>
                    {`${dateUtils.formatTxnTileTimestamp(txn.createdAt)}`}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            height: 48,
            width: '100%',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            backgroundColor: theme.colors.secondary,
            marginVertical: theme.spacing.md,
        },
        leftContainer: {
            flexShrink: 0,
        },
        centerContainer: {
            flex: 1,
            width: '100%',
            flexDirection: 'column',
        },
        rightContainer: {
            flexShrink: 0,
            flexDirection: 'column',
            justifyContent: 'flex-end',
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
    })

export default TransactionTile
