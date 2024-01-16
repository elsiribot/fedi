import { useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useTxnDisplayUtils } from '@fedi/common/hooks/transactions'
import { selectActiveFederationId } from '@fedi/common/redux'
import { updateTransactionNotes } from '@fedi/common/redux/transactions'
import type { Transaction } from '@fedi/common/types'
import { formatErrorMessage } from '@fedi/common/utils/format'
import {
    makeStabilityTxnDetailTitleText,
    makeStabilityTxnStatusSubtext,
    makeStabilityTxnStatusText,
} from '@fedi/common/utils/wallet'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { HistoryIcon } from '../../ui/HistoryIcon'
import { HistoryList } from '../../ui/HistoryList'
import { CurrencyAvatar } from './CurrencyAvatar'

type StabilityTransactionsListProps = {
    transactions: Transaction[]
    loading?: boolean
    loadMoreTransactions: () => void
}

const StabilityTransactionsList = ({
    transactions,
    loading,
    loadMoreTransactions,
}: StabilityTransactionsListProps) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const {
        makeStabilityTxnDetailAmountText,
        makeStabilityTxnAmountText,
        makeStabilityTxnDetailItems,
    } = useTxnDisplayUtils(t)

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
                timestamp: txn.createdAt,
            })}
            makeDetailProps={txn => ({
                title: makeStabilityTxnDetailTitleText(t, txn),
                items: makeStabilityTxnDetailItems(txn),
                amount: makeStabilityTxnDetailAmountText(txn),
                notes: txn.notes,
                onSaveNotes: async (notes: string) => {
                    try {
                        if (!activeFederationId)
                            throw new Error('errors.unknown-error')
                        await dispatch(
                            updateTransactionNotes({
                                fedimint,
                                notes,
                                federationId: activeFederationId,
                                transactionId: txn.id,
                            }),
                        ).unwrap()
                    } catch (err) {
                        toast?.show(
                            formatErrorMessage(t, err, 'errors.unknown-error'),
                        )
                    }
                },
            })}
            onEndReached={loadMoreTransactions}
        />
    )
}

export default StabilityTransactionsList
