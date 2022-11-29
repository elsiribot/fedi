import { Overlay } from '@rneui/themed'
import React, { useState } from 'react'
import { Dimensions, FlatList, ListRenderItem, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Transaction } from '../../../bridge'
import TransactionDetail from './TransactionDetail'
import TransactionTile from './TransactionTile'

type TransactionsListProps = {
    transactions: Transaction[]
}

const WINDOW_WIDTH = Dimensions.get('window').width

const TransactionsList = ({ transactions }: TransactionsListProps) => {
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
        <SafeAreaView style={styles.container}>
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
                overlayStyle={styles.overlayContainer}
                onBackdropPress={() => setSelectedTransaction(null)}>
                {selectedTransaction && (
                    <TransactionDetail
                        txn={selectedTransaction}
                        handleCloseModal={() => setSelectedTransaction(null)}
                    />
                )}
            </Overlay>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    overlayContainer: {
        borderRadius: 20,
    },
})

export default TransactionsList
