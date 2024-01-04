import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { selectActiveFederation } from '@fedi/common/redux'
import { Transaction, TransactionDirection } from '@fedi/common/types'
import { RpcTransaction } from '@fedi/common/types/bindings'
import { makeLog } from '@fedi/common/utils/log'

import TransactionsList from '../components/feature/transaction-history/TransactionsList'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('Transactions')

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { listTransactions } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    const isV0Federation = useAppSelector(selectActiveFederation)?.version === 0
    const lastTimestampRef = useRef<number | undefined>()

    const getTransactionsList = useCallback(async () => {
        try {
            let fetchedTransactions: RpcTransaction[]
            if (isV0Federation) {
                fetchedTransactions = await listTransactions()
            } else {
                fetchedTransactions = await listTransactions(
                    lastTimestampRef.current,
                    100,
                )
            }

            // Filter out onchain addresses older than 1 hour
            // that are still waiting for a txn
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
            setTransactionsList(prev => [...prev, ...filteredTransactions])

            return
        } catch (err: any) {
            log.error('Failed to fetch transactions:', err)
            toast?.show('Failed to fetch transactions')
        }
    }, [isV0Federation, listTransactions, toast])

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
            await new Promise(resolve => setTimeout(resolve, 1000))
            await getTransactionsList()
            setIsLoading(false)
        }
        loadTransactions()
    }, [getTransactionsList])

    useEffect(() => {
        lastTimestampRef.current = transactionsList.length
            ? transactionsList[transactionsList.length - 1].createdAt
            : undefined
    }, [transactionsList])

    return (
        <View style={styles.container}>
            <TransactionsList
                transactions={transactionsList}
                loading={isLoading}
                loadMoreTransactions={
                    isV0Federation ? undefined : getTransactionsList
                }
                updateTransactionInState={updateTransactionInState}
                isV1Federation={false}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
})

export default Transactions
