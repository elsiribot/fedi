import { Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { selectBtcExchangeRate, selectCurrency } from '@fedi/common/redux'
import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'
import { makeTxnStatusText } from '@fedi/common/utils/wallet'

import { useAppSelector } from '../../../state/hooks'
import SvgImage, { SvgImageName } from '../../ui/SvgImage'

type TransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}
type TxnSubIconProps = { svgName: string; color: string }

const TransactionTile = ({ txn, selectTransaction }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const currency = useAppSelector(selectCurrency)
    const btcExchangeRate = useAppSelector(selectBtcExchangeRate)

    const style = styles(theme)

    const renderAmount = () => {
        if (txn.bitcoin && txn.amount === 0)
            return t('words.onchain').toLowerCase()

        const fiatAmount = amountUtils.msatToFiat(txn.amount, btcExchangeRate)
        const formattedAmount = amountUtils.formatFiat(fiatAmount, currency, {
            noSymbol: true,
        })
        const sign = txn.direction === TransactionDirection.send ? `-` : `+`

        return (
            <View style={style.amountContainer}>
                <Text caption medium>
                    {sign}
                    {formattedAmount}
                </Text>
                <Text tiny medium style={style.amountSuffix}>
                    {currency}
                </Text>
            </View>
        )
    }

    const renderSubIcon = () => {
        let subIconProps: TxnSubIconProps

        if (txn.direction === TransactionDirection.send) {
            subIconProps = {
                svgName: 'ArrowUpBadge',
                color: theme.colors.black,
            }
        } else if (
            txn.lnState?.type === 'waitingForPayment' ||
            (txn.bitcoin && txn.onchainState?.type !== 'claimed') ||
            (txn.lightning && !txn.lnState)
        ) {
            subIconProps = {
                svgName: 'PendingBadge',
                color: theme.colors.fuschia,
            }
        } else {
            subIconProps = {
                svgName: 'ArrowDownBadge',
                color: theme.colors.green,
            }
        }

        return (
            <SvgImage
                name={subIconProps.svgName as SvgImageName}
                color={subIconProps.color}
                size={20}
                containerStyle={style.txnBadge}
            />
        )
    }

    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[
                style.container,
                txn.bitcoin &&
                txn.onchainState?.type === 'waitingForTransaction'
                    ? style.pending
                    : {},
            ]}
            hitSlop={4}>
            <View style={style.leftContainer}>
                <SvgImage
                    name="BitcoinCircle"
                    color={theme.colors.orange}
                    size={38}
                />
                {renderSubIcon()}
            </View>
            <View style={style.centerContainer}>
                <Text caption medium>
                    {makeTxnStatusText(t, txn)}
                </Text>
                {txn.notes && (
                    <Text small numberOfLines={1} style={style.subText}>
                        {txn.notes}
                    </Text>
                )}
            </View>

            <View style={style.rightContainer}>
                {renderAmount()}
                <Text small style={[style.rightAlignedText, style.subText]}>
                    {dateUtils.formatTxnTileTimestamp(txn.createdAt)}
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
            width: '100%',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.xl,
            backgroundColor: theme.colors.secondary,
            marginBottom: theme.spacing.lg,
        },
        leftContainer: {
            flexShrink: 0,
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
        txnBadge: {
            position: 'absolute',
            left: -6,
            top: -6,
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

export default TransactionTile
