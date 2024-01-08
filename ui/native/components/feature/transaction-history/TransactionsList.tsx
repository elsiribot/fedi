import React from 'react'
import { useTranslation } from 'react-i18next'

import { Transaction } from '@fedi/common/types'
import {
    makeTxnDetailItems,
    makeTxnDetailTitleText,
    makeTxnStatusText,
} from '@fedi/common/utils/wallet'

import { useBridge } from '../../../state/hooks'
import { HistoryList } from '../../ui/HistoryList'
import { TransactionIcon } from './TransactionIcon'

type TransactionsListProps = {
    transactions: Transaction[]
    isV1Federation: boolean
    loading?: boolean
    loadMoreTransactions?: () => void
    updateTransactionInState: (
        transactionId: string,
        updatedNotes: string,
    ) => void
}

const TransactionsList = ({
    transactions,
    isV1Federation,
    loading,
    loadMoreTransactions,
    updateTransactionInState,
}: TransactionsListProps) => {
    const { t } = useTranslation()
    const { updateTransactionNotes } = useBridge()

    return (
        <HistoryList
            rows={transactions}
            loading={loading}
            makeIcon={txn => <TransactionIcon txn={txn} />}
            makeRowProps={txn => ({
                status: makeTxnStatusText(t, txn),
                amount: txn.amount,
                direction:
                    txn.direction === 'receive' ? 'incoming' : 'outgoing',
                timestamp: txn.createdAt,
                notes: txn.notes,
            })}
            makeDetailProps={txn => ({
                title: makeTxnDetailTitleText(t, txn),
                items: makeTxnDetailItems(t, txn),
                amount: txn.amount,
                notes: txn.notes,
                onSaveNotes: async (notes: string) => {
                    await updateTransactionNotes(txn.id, notes)
                    updateTransactionInState(txn.id, notes)
                },
            })}
            onEndReached={isV1Federation ? loadMoreTransactions : undefined}
        />
    )
}

export default TransactionsList
