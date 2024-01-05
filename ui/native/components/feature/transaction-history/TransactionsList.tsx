import React from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederationId } from '@fedi/common/redux'
import { updateTransactionNotes } from '@fedi/common/redux/transactions'
import { Transaction } from '@fedi/common/types'
import { formatErrorMessage } from '@fedi/common/utils/format'
import {
    makeTxnDetailItems,
    makeTxnDetailTitleText,
    makeTxnStatusText,
} from '@fedi/common/utils/wallet'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import { HistoryList } from '../../ui/HistoryList'
import { TransactionIcon } from './TransactionIcon'

type TransactionsListProps = {
    transactions: Transaction[]
    loading?: boolean
    loadMoreTransactions?: () => void
}

const TransactionsList: React.FC<TransactionsListProps> = ({
    transactions,
    loading,
    loadMoreTransactions,
}) => {
    const dispatch = useAppDispatch()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const activeFederationId = useAppSelector(selectActiveFederationId)

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

export default TransactionsList
