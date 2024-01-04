import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectCurrency } from '@fedi/common/redux'
import type { StabilityPoolTxn } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import {
    makeStabilityTxnDetailItems,
    makeStabilityTxnDetailTitleText,
    makeStabilityTxnStatusSubtext,
    makeStabilityTxnStatusText,
} from '@fedi/common/utils/wallet'

import { useAppSelector } from '../../../state/hooks'
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
    const selectedCurrency = useAppSelector(selectCurrency)

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
                amount: amountUtils.formatFiat(
                    txn.amountCents / 100,
                    selectedCurrency,
                ),
                direction:
                    txn.direction === 'deposit' ? 'incoming' : 'outgoing',
                timestamp: txn.timestamp,
            })}
            makeDetailProps={txn => ({
                title: makeStabilityTxnDetailTitleText(t, txn),
                items: makeStabilityTxnDetailItems(t, txn),
                amount: amountUtils.formatFiat(
                    txn.amountCents / 100,
                    selectedCurrency,
                ),
            })}
        />
    )
}

export default StabilityTransactionsList
