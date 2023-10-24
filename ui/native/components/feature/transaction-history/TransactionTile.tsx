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
        if (txn.lightning) {
            if (!txn.lnState) return `${t('phrases.receive-pending')}`
            switch (txn.lnState.type) {
                case 'waitingForPayment':
                    return t('phrases.receive-pending')
                case 'claimed':
                    return t('words.received')
                case 'canceled':
                    return t('words.canceled')
                default:
                    return t('phrases.receive-pending')
            }
        } else if (txn.bitcoin) {
            switch (txn.onchainState?.type) {
                case 'waitingForTransaction':
                    return t('phrases.address-created')
                case 'claimed':
                    return t('words.received')
                default:
                    return t('phrases.receive-pending')
            }
        } else {
            return t('words.received')
        }
    }

    const renderAmount = () => {
        return txn.bitcoin && txn.amount === 0
            ? t('words.onchain').toLowerCase()
            : `${amountUtils.formatNumber(
                  amountUtils.msatToSat(txn.amount),
              )} ${t('words.sats').toUpperCase()}`
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
                <Text>{renderStatus()}</Text>
                <Text small numberOfLines={1}>
                    {txn.notes}
                </Text>
            </View>

            <View style={style.rightContainer}>
                <Text style={style.rightAlignedText}>{renderAmount()}</Text>
                <Text small style={[style.rightAlignedText, style.subText]}>
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
        pending: {
            opacity: 0.6,
        },
    })

export default TransactionTile
