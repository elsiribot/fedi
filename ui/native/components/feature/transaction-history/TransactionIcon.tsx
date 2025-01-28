import { useTheme } from '@rneui/themed'
import React from 'react'

import { makeTxnStatusIcon } from '@fedi/common/utils/wallet'

import { Transaction } from '../../../types'
import SvgImage from '../../ui/SvgImage'
import { HistoryIcon } from './HistoryIcon'

interface Props {
    txn: Transaction
}

export const TransactionIcon: React.FC<Props> = ({ txn }) => {
    const { theme } = useTheme()

    const badge = makeTxnStatusIcon(txn)

    return (
        <HistoryIcon badge={badge}>
            <SvgImage
                name="BitcoinCircle"
                color={theme.colors.orange}
                size={theme.sizes.historyIcon}
            />
        </HistoryIcon>
    )
}
