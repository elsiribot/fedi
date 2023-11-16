import { Avatar, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { selectCurrency } from '@fedi/common/redux'
import { StabilityPoolTxn } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { useAppSelector } from '../../../state/hooks'

type StabilityTransactionTileProps = {
    txn: StabilityPoolTxn
    selectTransaction: (txn: StabilityPoolTxn) => void
}

const StabilityTransactionTile = ({
    txn,
    selectTransaction,
}: StabilityTransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const selectedCurrency = useAppSelector(selectCurrency)

    const style = styles(theme)
    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[style.container]}>
            <View style={style.leftContainer}>
                <Avatar
                    size={theme.sizes.md}
                    rounded
                    title={selectedCurrency}
                    titleStyle={style.currencyAvatarTitle}
                    containerStyle={style.currencyAvatar}
                />
            </View>
            <View style={style.centerContainer}>
                <Text>
                    {`${
                        txn.direction === 'deposit'
                            ? t('words.deposit')
                            : t('words.withdrawal')
                    }`}
                </Text>
                <Text small style={[style.subText]}>
                    {txn.status === 'complete'
                        ? t('words.complete')
                        : `${t('words.pending')}...`}
                </Text>
            </View>

            <View style={style.rightContainer}>
                <Text style={style.rightAlignedText}>
                    {`${amountUtils.formatFiat(
                        txn.amountCents / 100,
                        selectedCurrency,
                    )} `}
                </Text>
                {txn.timestamp && (
                    <Text small style={[style.rightAlignedText, style.subText]}>
                        {`${dateUtils.formatTxnTileTimestamp(txn.timestamp)}`}
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
        currencyAvatar: {
            backgroundColor: theme.colors.green,
        },
        currencyAvatarTitle: {
            ...theme.styles.avatarText,
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
