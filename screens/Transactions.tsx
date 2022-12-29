import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Transaction } from '../bridge'
import TransactionsList from '../components/feature/transaction-history/TransactionsList'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { t } = useTranslation()
    const { listTransactions } = useBridge()
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    const getTransactionsList = useCallback(async () => {
        const fetchedTransactions = await listTransactions()
        console.info('fetchedTransactions', fetchedTransactions.length)
        setTransactionsList(fetchedTransactions.map(tx => new Transaction(tx)))
    }, [listTransactions])

    useEffect(() => {
        setIsLoading(true)
        getTransactionsList()
        setIsLoading(false)
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
