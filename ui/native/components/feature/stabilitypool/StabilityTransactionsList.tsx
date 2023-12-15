import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import type { MSats, StabilityPoolTxn } from '@fedi/common/types'
import {
    makeStabilityTxnDetailItems,
    makeStabilityTxnDetailTitleText,
    makeStabilityTxnStatusSubtext,
    makeStabilityTxnStatusText,
} from '@fedi/common/utils/wallet'

import { HistoryIcon } from '../../ui/HistoryIcon'
import { HistoryList } from '../../ui/HistoryList'
import { CurrencyAvatar } from './CurrencyAvatar'

type StabilityTransactionsListProps = {
    transactions: StabilityPoolTxn[]
    refreshTransactions: () => void
}

const StabilityTransactionsList = ({
    transactions,
}: StabilityTransactionsListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <HistoryList
            rows={transactions}
            makeIcon={() => (
                <HistoryIcon>
                    <CurrencyAvatar size={theme.sizes.historyIcon} />
                </HistoryIcon>
            )}
            makeRowProps={txn => ({
                status: makeStabilityTxnStatusText(t, txn),
                notes: makeStabilityTxnStatusSubtext(t, txn),
                amount: 0 as MSats,
                timestamp: txn.timestamp,
            })}
            makeDetailProps={txn => ({
                title: makeStabilityTxnDetailTitleText(t, txn),
                items: makeStabilityTxnDetailItems(t, txn),
                amount: 0 as MSats,
            })}
        />
    )
}

export default StabilityTransactionsList
