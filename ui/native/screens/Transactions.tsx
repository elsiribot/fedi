import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, ScrollView } from 'react-native'

<<<<<<< HEAD
import { Transaction, TransactionDirection } from '@fedi/common/types'
import { RpcTransaction } from '@fedi/common/types/bindings'
import { makeLog } from '@fedi/common/utils/log'
=======
import { selectActiveFederationId } from '@fedi/common/redux'
import type { Transaction } from '@fedi/common/types'
>>>>>>> f319b4c8 (add: check for vederation version)

import TransactionsList from '../components/feature/transaction-history/TransactionsList'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

const log = makeLog('Transactions')

export type Props = NativeStackScreenProps<RootStackParamList, 'Transactions'>

const Transactions: React.FC<Props> = () => {
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederationId)

    const { listTransactions, listFederations } = useBridge()
    const { toast } = useEnvironmentContext().state
    const [isLoading, setIsLoading] = useState(false)
    const [isV1Federation, setIsV1Federation] = useState(true)
    // TODO: Hoist this into context so we can easily update individual
    // transactions and not have to refreshTransactions on every notes update
    const [transactionsList, setTransactionsList] = useState<Transaction[]>([])

    const lastTimestamp = transactionsList.length
        ? transactionsList[transactionsList.length - 1].createdAt
        : undefined

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
    const checkFederationVersion = useCallback(async () => {
        const version = (await listFederations()).find(
            n => n.id === activeFederationId,
        )?.version

        if (version === 0) {
            setIsV1Federation(false)
        }
    }, [activeFederationId, listFederations])

    const getTransactionsList = useCallback(async () => {
        try {
            if (!isV1Federation) {
                const fetchedTransactions = await listTransactions()
                setTransactionsList(prev => [...prev, ...fetchedTransactions])

                return
            }

            const fetchedTransactions = await listTransactions(
                lastTimestamp,
                12,
            )
            setTransactionsList(prev => [...prev, ...fetchedTransactions])
        } catch (err: any) {
            console.error('Failed to fetch transactions:', err)
            toast?.show('Failed to fetch transactions')
        }
    }, [isV1Federation, listTransactions, lastTimestamp, toast])

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
        const checkVersion = async () => {
            await checkFederationVersion()
        }
        checkVersion()
    }, [checkFederationVersion])

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
                    loadMoreTransactions={getTransactionsList}
                    updateTransactionInState={updateTransactionInState}
                    isV1Federation={isV1Federation}
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
