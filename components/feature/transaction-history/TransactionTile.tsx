import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { Transaction, TransactionDirection } from '../../../bridge'
import amountUtils from '../../../utils/AmountUtils'
import DateUtils from '../../../utils/DateUtils'

type TransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}

const TransactionTile = ({ txn, selectTransaction }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    console.log(txn.direction)
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
                <Icon
                    name="bitcoin"
                    type="material-community"
                    color={theme.colors.orange}
                    size={theme.sizes.md}
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
                <Text>{'Memo here'}</Text>
            </View>

            <View style={styles(theme).rightContainer}>
                <Text style={styles(theme).rightAlignedText}>
                    {`${amountUtils.millisToSats(txn.amount)} ${t(
                        'words.sats',
                    ).toUpperCase()}`}
                </Text>
                <Text
                    style={[
                        styles(theme).rightAlignedText,
                        styles(theme).subText,
                    ]}>
                    {`${DateUtils.formatTimestamp(
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
            paddingHorizontal: 24,
            marginVertical: 10,
        },
        leftContainer: {
            width: '10%',
        },
        centerContainer: {
            width: '60%',
            paddingHorizontal: 8,
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
            fontSize: theme.sizes.xs,
            opa: theme.colors.primaryLight,
        },
    })

export default TransactionTile
