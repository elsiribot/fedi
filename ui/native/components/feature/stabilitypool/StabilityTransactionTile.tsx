import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type StabilityTransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}

const StabilityTransactionTile = ({
    txn,
    selectTransaction,
}: StabilityTransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[styles(theme).container]}>
            <View style={styles(theme).leftContainer}>
                <SvgImage
                    name="BitcoinCircle"
                    color={theme.colors.green}
                    size={SvgImageSize.md}
                />
            </View>
            <View style={styles(theme).centerContainer}>
                <Text>
                    {`${
                        txn.direction === TransactionDirection.send
                            ? t('words.sent')
                            : t('words.received')
                    }`}
                </Text>
                <Text small numberOfLines={1}>
                    {txn.notes}
                </Text>
            </View>

            <View style={styles(theme).rightContainer}>
                <Text style={styles(theme).rightAlignedText}>
                    {`${amountUtils.formatNumber(
                        amountUtils.msatToSat(txn.amount),
                    )} ${t('words.sats').toUpperCase()}`}
                </Text>
                <Text
                    small
                    style={[
                        styles(theme).rightAlignedText,
                        styles(theme).subText,
                    ]}>
                    {`${dateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd, h:mmaaa',
                    )}`}
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
    })

export default StabilityTransactionTile
