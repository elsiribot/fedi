import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, ScrollView } from 'react-native'

import { Transaction, TransactionDirection } from '@fedi/common/types'
import { RpcTransaction } from '@fedi/common/types/bindings'
import { makeLog } from '@fedi/common/utils/log'

import TransactionsList from '../components/feature/transaction-history/TransactionsList'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('Transactions')

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { listTransactions } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])
    const [lastTimestamp, setLastTimestamp] = useState<number | undefined>(
        undefined,
    )

    const getTransactionsList = useCallback(async () => {
        try {
            const fetchedTransactions = await listTransactions()
            log.info('fetchedTransactions', fetchedTransactions.length)

            // Filter out onchain addresses generated >1 hr ago that
            // still haven't been seen in mempool
            const filteredTransactions = fetchedTransactions.filter(
                (txn: RpcTransaction) => {
                    if (
                        txn.bitcoin &&
                        txn.direction === TransactionDirection.receive &&
                        txn.onchainState?.type === 'waitingForTransaction' &&
                        Date.now() / 1000 - txn.createdAt > 3600
                    ) {
                        return false
                    }
                    return true
                },
            )
            log.info('filteredTransactions', filteredTransactions.length)
            setTransactionsList(filteredTransactions)
        } catch (err: any) {
            log.error('Failed to fetch transactions:', err)
            toast?.show('Failed to fetch transactions')
        }
    }, [listTransactions, toast])
    const getTransactionsList = useCallback(
        async (timestamp?: number) => {
            try {
                const fetchedTransactions = await listTransactions(
                    timestamp,
                    15,
                )
                if (fetchedTransactions.length > 0) {
                    const oldestTransactionTimestamp =
                        fetchedTransactions[fetchedTransactions.length - 1]
                            .createdAt
                    setLastTimestamp(oldestTransactionTimestamp)
                }
                setTransactionsList(prev => [...prev, ...fetchedTransactions])
            } catch (err: any) {
                console.error('Failed to fetch transactions:', err)
                toast?.show('Failed to fetch transactions')
            }
        },
        [listTransactions, toast],
    )

    // Instead of refreshing the whole transaction list
    // Just update the state of the transaction locally
    // So that the user sees the update
    const updateTransactionInState = (
        transactionId: string,
        updatedNotes: string,
    ) => {
        setTransactionsList(prevList =>
            prevList.map(transaction =>
                transaction.id === transactionId
                    ? { ...transaction, notes: updatedNotes }
                    : transaction,
            ),
        )
    }

    useEffect(() => {
        setIsLoading(true)
        const loadTransactions = async () => {
            await getTransactionsList()
            setIsLoading(false)
        }
        loadTransactions()
    }, [getTransactionsList])

    if (isLoading) return <ActivityIndicator />

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <TransactionsList
                    transactions={transactionsList}
                    loadMoreTransactions={() =>
                        getTransactionsList(lastTimestamp)
                    }
                    updateTransactionInState={updateTransactionInState}
                />
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default Transactions
