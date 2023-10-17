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

    const renderStatus = () => {
        if (txn.direction === TransactionDirection.send) {
            return t('words.sent')
        }
        // lnState types are not clean yet but make sure to at least
        // show pending for unpaid, newly generated LN invoices
        if (!txn.lnState) return `${t('words.receive-pending')}`
        switch (txn.lnState.type) {
            case 'waitingForPayment':
                return t('words.pending')
            case 'claimed':
                return t('words.received')
            default:
                return t('words.received')
        }
    }

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
                    name="BitcoinCircle"
                    color={theme.colors.orange}
                    size={SvgImageSize.md}
                />
            </View>
            <View style={styles(theme).centerContainer}>
                <Text>{renderStatus()}</Text>
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

export default TransactionTile
