import { Icon, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Transaction } from '../bridge'

type TransactionsListProps = {
    transactions: Transaction[]
}

type TransactionTileProps = {
    txn: Transaction
}

const WINDOW_WIDTH = Dimensions.get('window').width

const TransactionTile = ({ txn }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <View style={styles(theme).tileContainer}>
            <View style={styles(theme).leftContainer}>
                <Icon
                    name="bitcoin"
                    type="material-community"
                    color={theme.colors.orange}
                    size={32}
                />
            </View>
            <View style={styles(theme).centerContainer}>
                <Text>
                    {`${
                        txn.outgoing === true
                            ? t('words.sent')
                            : t('words.received')
                    }`}
                </Text>
                <Text>{`Memo here`}</Text>
            </View>

            <View style={styles(theme).rightContainer}>
                <Text style={styles(theme).rightAlignedText}>
                    {`${txn.amountSats} ${t('words.sats').toUpperCase()}`}
                </Text>
                <Text
                    style={
                        styles(theme).rightAlignedText
                    }>{`${txn.createdAt}`}</Text>
            </View>
        </View>
    )
}

const TransactionsList = ({ transactions }: TransactionsListProps) => {
    const { theme } = useTheme()

    const renderTransaction: ListRenderItem<Transaction> = ({ item }) => {
        return <TransactionTile txn={item} />
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
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
        },
        tileContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            height: 48,
            backgroundColor: theme.colors.secondary,
            paddingHorizontal: 24,
            marginVertical: 10,
        },
        leftContainer: {
            width: '10%',
        },
        centerContainer: {
            width: '60%',
            paddingHorizontal: 8,
            flexDirection: 'column',
        },
        rightContainer: {
            width: '30%',
            flexDirection: 'column',
            justifyContent: 'flex-end',
        },
        rightAlignedText: {
            textAlign: 'right',
        },
    })

export default TransactionsList
