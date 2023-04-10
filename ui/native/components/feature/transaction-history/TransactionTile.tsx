import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type TransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}

const TransactionTile = ({ txn, selectTransaction }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[
                styles(theme).container,
                // TODO: Add opacity based on "pending" state for onchain txns
                // {
                //     opacity: txn.pending ? 0.6 : 1,
                // },
            ]}>
            <View style={styles(theme).leftContainer}>
                <SvgImage
                    name="Bitcoin"
                    color={theme.colors.orange}
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
                {/* TODO: truncate this */}
                <Text>{txn.notes}</Text>
            </View>

            <View style={styles(theme).rightContainer}>
                <Text style={styles(theme).rightAlignedText}>
                    {`${amountUtils.formatNumber(
                        amountUtils.msatToSat(txn.amount),
                    )} ${t('words.sats').toUpperCase()}`}
                </Text>
                <Text
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
            justifyContent: 'center',
            height: 48,
            backgroundColor: theme.colors.secondary,
            paddingHorizontal: theme.spacing.xl,
            marginVertical: theme.spacing.md,
        },
        leftContainer: {
            width: '10%',
        },
        centerContainer: {
            width: '60%',
            paddingHorizontal: theme.spacing.sm,
            flexDirection: 'column',
        },
        rightContainer: {
            width: '30%',
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
        rightAlignedText: {
            textAlign: 'right',
        },
        subText: {
            fontSize: theme.sizes.xxs,
            opa: theme.colors.primaryLight,
        },
    })

export default TransactionTile
