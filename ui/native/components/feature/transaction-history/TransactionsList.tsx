import { Overlay, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { Transaction } from '@fedi/common/types'

import TransactionDetail from './TransactionDetail'
import TransactionTile from './TransactionTile'

type TransactionsListProps = {
    transactions: Transaction[]
    refreshTransactions: () => void
}

const WINDOW_WIDTH = Dimensions.get('window').width

const TransactionsList = ({
    transactions,
    refreshTransactions,
}: TransactionsListProps) => {
    const { theme } = useTheme()
    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction | null>(null)

    const renderTransaction: ListRenderItem<Transaction> = ({ item }) => {
        return (
            <TransactionTile
                txn={item}
                selectTransaction={(txn: Transaction) =>
                    setSelectedTransaction(txn)
                }
            />
        )
    }

    return (
        <SafeAreaView style={styles(theme).container}>
            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item: Transaction) => `${item.id}`}
                // optimization that allows skipping the measurement of dynamic content
                // for fixed-size list items
                getItemLayout={(data, index) => ({
                    length: WINDOW_WIDTH,
                    offset: 48 * index,
                    index,
                })}
            />
            <Overlay
                isVisible={selectedTransaction !== null}
                overlayStyle={styles(theme).overlayContainer}
                onBackdropPress={() => setSelectedTransaction(null)}>
                {selectedTransaction && (
                    <TransactionDetail
                        txn={selectedTransaction}
                        handleCloseModal={() => setSelectedTransaction(null)}
                        refreshTransactions={refreshTransactions}
                    />
                )}
            </Overlay>
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
        },
        overlayContainer: {
            borderRadius: theme.borders.defaultRadius,
            width: '90%',
            alignItems: 'center',
        },
    })

export default TransactionsList
