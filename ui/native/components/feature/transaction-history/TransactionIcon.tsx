import { useTheme } from '@rneui/themed'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Transaction, TransactionDirection } from '../../../types'
import SvgImage, { SvgImageName } from '../../ui/SvgImage'

interface Props {
    txn: Transaction
}

export const TransactionIcon: React.FC<Props> = ({ txn }) => {
    const { theme } = useTheme()

    let badgeSvgName: SvgImageName
    let badgeColor: string
    if (txn.direction === TransactionDirection.send) {
        badgeSvgName = 'ArrowUpBadge'
        badgeColor = theme.colors.black
    } else if (
        txn.lnState?.type === 'waitingForPayment' ||
        (txn.bitcoin && txn.onchainState?.type !== 'claimed') ||
        (txn.lightning && !txn.lnState)
    ) {
        badgeSvgName = 'PendingBadge'
        badgeColor = theme.colors.fuschia
    } else {
        badgeSvgName = 'ArrowDownBadge'
        badgeColor = theme.colors.green
    }

    const style = styles()

    return (
        <View style={style.container}>
            <SvgImage
                name="BitcoinCircle"
                color={theme.colors.orange}
                size={38}
            />
            <SvgImage
                name={badgeSvgName}
                color={badgeColor}
                size={20}
                containerStyle={style.badge}
            />
        </View>
    )
}

const styles = () =>
    StyleSheet.create({
        container: {
            flexShrink: 0,
        },
        badge: {
            position: 'absolute',
            left: -6,
            top: -6,
        },
    })
