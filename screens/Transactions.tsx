import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import { listTransactions, Transaction } from '../bridge'
import TransactionsList from '../components/feature/transaction-history/TransactionsList'

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { t } = useTranslation()
    const [isLoading, setIsLoading] = useState(false)
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    useEffect(() => {
        const getTransactionsList = async () => {
            setIsLoading(true)
            const fetchedTransactions = await listTransactions()
            console.log('fetchedTransactions', fetchedTransactions)
            setIsLoading(false)
            setTransactionsList(fetchedTransactions)
        }

        getTransactionsList()
    }, [])

    if (isLoading) return <ActivityIndicator />

    return (
        <View style={styles.container}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <TransactionsList transactions={transactionsList} />
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
