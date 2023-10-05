import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import StabilityTransactionsList from '../components/feature/stabilitypool/StabilityTransactionsList'
import { Transaction } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'StabilityHistory'
>

const StabilityHistory: React.FC<Props> = () => {
    const { t } = useTranslation()
    // const { listTransactions } = useBridge()
    const [isLoading, setIsLoading] = useState(false)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    // const getTransactionsList = useCallback(async () => {
    //     const fetchedTransactions = await listTransactions()
    //     console.info('fetchedTransactions', fetchedTransactions.length)
    //     setTransactionsList(fetchedTransactions)
    // }, [listTransactions])

    // useEffect(() => {
    //     setIsLoading(true)
    //     getTransactionsList()
    //     setIsLoading(false)
    // }, [getTransactionsList])

    if (isLoading) return <ActivityIndicator />

    return (
        <View style={styles.container}>
            {transactionsList.length === 0 ? (
                <Text>{t('phrases.no-transactions')}</Text>
            ) : (
                <StabilityTransactionsList
                    transactions={transactionsList}
                    refreshTransactions={() => {}}
                    // refreshTransactions={getTransactionsList}
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

export default StabilityHistory
