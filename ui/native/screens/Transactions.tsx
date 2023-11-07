import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

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
    const { t } = useTranslation()
    const { listTransactions } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    const isV1Federation = useAppSelector(selectActiveFederation).version === 1
    const lastTimestampRef = useRef<number | undefined>()

    const getTransactionsList = useCallback(async () => {
        try {
            let fetchedTransactions: RpcTransaction[]
            if (isV1Federation) {
                fetchedTransactions = await listTransactions(
                    lastTimestampRef.current,
                    100,
                )
            } else {
                fetchedTransactions = await listTransactions()
            }

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
    }, [isV1Federation, listTransactions, toast])

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
            await checkFederationVersion()
            await getV0TransactionsList()
            await getTransactionsList()
            setIsLoading(false)
        }
        loadTransactions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        lastTimestampRef.current = transactionsList.length
            ? transactionsList[transactionsList.length - 1].createdAt
            : undefined
    }, [transactionsList])

    if (isLoading) return <ActivityIndicator />

    return (
        <View style={styles.container}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <TransactionsList
                    transactions={transactionsList}
                    loadMoreTransactions={
                        isV1Federation ? getTransactionsList : undefined
                    }
                    updateTransactionInState={updateTransactionInState}
                />
            )}
        </View>
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

