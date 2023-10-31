import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Transaction, TransactionDirection } from '@fedi/common/types'
import { RpcTransaction } from '@fedi/common/types/bindings'

import TransactionsList from '../components/feature/transaction-history/TransactionsList'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { listTransactions } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    const getTransactionsList = useCallback(async () => {
        try {
            const fetchedTransactions = await listTransactions()
            console.info('fetchedTransactions', fetchedTransactions.length)

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
            console.info('filteredTransactions', filteredTransactions.length)
            setTransactionsList(filteredTransactions)
        } catch (err: any) {
            console.error('Failed to fetch transactions:', err)
            toast?.show('Failed to fetch transactions')
        }
    }, [listTransactions, toast])

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
        <View style={styles.container}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <TransactionsList
                    transactions={transactionsList}
                    refreshTransactions={getTransactionsList}
                />
            )}
        </View>
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
})

export default Transactions
