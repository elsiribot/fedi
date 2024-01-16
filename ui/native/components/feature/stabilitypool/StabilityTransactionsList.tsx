import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useTxnDisplayUtils } from '@fedi/common/hooks/transactions'
import type { StabilityPoolTxn } from '@fedi/common/types'
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
    loading?: boolean
    refreshTransactions: () => void
}

const StabilityTransactionsList = ({
    transactions,
    loading,
}: StabilityTransactionsListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { makeStabilityTxnDetailAmountText, makeStabilityTxnAmountText } =
        useTxnDisplayUtils(t)

    return (
        <HistoryList
            rows={transactions}
            loading={loading}
            makeIcon={() => (
                <HistoryIcon>
                    <CurrencyAvatar size={theme.sizes.historyIcon} />
                </HistoryIcon>
            )}
            makeRowProps={txn => ({
                status: makeStabilityTxnStatusText(t, txn),
                notes: makeStabilityTxnStatusSubtext(t, txn),
                amount: makeStabilityTxnAmountText(txn),
                timestamp: txn.timestamp,
            })}
            makeDetailProps={txn => ({
                title: makeStabilityTxnDetailTitleText(t, txn),
                items: makeStabilityTxnDetailItems(t, txn),
                amount: makeStabilityTxnDetailAmountText(txn),
            })}
        />
    )
}

export default StabilityTransactionsList
