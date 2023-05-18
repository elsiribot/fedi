import orderBy from 'lodash/orderBy'
import React, { use, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'
import { Transaction } from '@fedi/common/types'

import { ContentBlock } from '../components/ContentBlock'
import { HoloLoader } from '../components/HoloLoader'
import { Text } from '../components/Text'
import { TransactionDialog } from '../components/TransactionDialog'
import { TransactionRow } from '../components/TransactionRow'
import { useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'

const TransactionsPage: React.FC = () => {
    const { t } = useTranslation()
    const toast = useToast()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const [isLoading, setIsLoading] = useState(true)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction>()

    const refreshTransactions = useCallback(() => {
        if (!federationId) return
        fedimint
            .listTransactions(federationId)
            .then(res => {
                setTransactions(orderBy(res))
            })
            .catch(err => {
                toast.showErrorToast(err, 'errors.unknown-error')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [federationId, toast])

    useEffect(() => {
        refreshTransactions()
    }, [refreshTransactions])

    let content
    if (isLoading) {
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
                {transactions.map(transaction => (
                    <TransactionRow
                        key={transaction.id}
                        transaction={transaction}
                        onClick={() => setSelectedTransaction(transaction)}
                    />
                ))}
            </TransactionsList>
        )
    }

    return (
        <ContentBlock>
            <Title>
                <Text variant="h1">{t('words.transactions')}</Text>
            </Title>
            {content}
            <TransactionDialog
                open={!!selectedTransaction}
                transaction={selectedTransaction}
                onOpenChange={() => setSelectedTransaction(undefined)}
                onSaveNote={refreshTransactions}
            />
        </ContentBlock>
    )
}

const Title = styled('div', {
    marginBottom: 16,
})

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
})

const TransactionsList = styled('div', {
    margin: '0 -16px',
})

export default TransactionsPage
