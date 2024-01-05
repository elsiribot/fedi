import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import { useTransactionHistory } from '@fedi/common/hooks/transactions'
import { Transaction } from '@fedi/common/types'

import { ContentBlock } from '../components/ContentBlock'
import { HoloLoader } from '../components/HoloLoader'
import * as Layout from '../components/Layout'
import { TransactionDialog } from '../components/TransactionDialog'
import { TransactionRow } from '../components/TransactionRow'
import { TransactionRowError } from '../components/TransactionRowError'
import { useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'

const TransactionsPage: React.FC = () => {
    const { t } = useTranslation()
    const toast = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction>()
    const { transactions, fetchTransactions } = useTransactionHistory(fedimint)

    useEffect(() => {
        fetchTransactions()
            .catch(err => {
                toast.showErrorToast(err, 'errors.unknown-error')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [fetchTransactions, toast])

    let content
    if (isLoading && !transactions.length) {
        content = (
            <Loading>
                <HoloLoader size="xl" />
            </Loading>
        )
    } else if (transactions.length < 1) {
        content = <EmptyState>{t('phrases.no-transactions')}</EmptyState>
    } else {
        content = (
            <TransactionsList>
                {transactions.map((transaction, idx) => (
                    <ErrorBoundary
                        key={transaction?.id || idx}
                        fallback={props => (
                            <TransactionRowError
                                {...props}
                                transaction={transaction}
                            />
                        )}>
                        <TransactionRow
                            transaction={transaction}
                            onClick={() => setSelectedTransaction(transaction)}
                        />
                    </ErrorBoundary>
                ))}
            </TransactionsList>
        )
    }

    return (
        <ContentBlock>
            <Layout.Root>
                <Layout.Header>
                    <Layout.Title>{t('words.transactions')}</Layout.Title>
                </Layout.Header>
                <Layout.Content centered={isLoading} fullWidth>
                    {content}
                </Layout.Content>
            </Layout.Root>
            <TransactionDialog
                open={!!selectedTransaction}
                transaction={selectedTransaction}
                onOpenChange={() => setSelectedTransaction(undefined)}
            />
        </ContentBlock>
    )
}

const Loading = styled('div', {
    padding: '48px 16px 16px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
})

const EmptyState = styled('div', {
    padding: '48px 16px',
    textAlign: 'center',
    color: theme.colors.darkGrey,
    fontSize: theme.fontSizes.h2,
    border: `1px dashed ${theme.colors.lightGrey}`,
    borderRadius: 16,

    '@sm': {
        margin: '0 16px',
    },
})

const TransactionsList = styled('div')

export default TransactionsPage
