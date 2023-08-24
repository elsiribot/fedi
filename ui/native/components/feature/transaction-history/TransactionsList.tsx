import { Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import type { Transaction } from '@fedi/common/types'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import TransactionDetail from './TransactionDetail'
import TransactionTile from './TransactionTile'
import { TransactionTileError } from './TransactionTileError'

type TransactionsListProps = {
    transactions: Transaction[]
    refreshTransactions: () => void
}

const WINDOW_WIDTH = Dimensions.get('window').width

const TransactionsList = ({
    transactions,
    refreshTransactions,
}: TransactionsListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [selectedTransaction, setSelectedTransaction] =
        useState<Transaction | null>(null)

    const renderTransaction: ListRenderItem<Transaction> = ({ item }) => {
        return (
            <ErrorBoundary fallback={() => <TransactionTileError />}>
                <TransactionTile
                    txn={item}
                    selectTransaction={(txn: Transaction) =>
                        setSelectedTransaction(txn)
                    }
                />
            </ErrorBoundary>
        )
    }

    return (
        <SafeAreaView
            edges={['left', 'right', 'bottom']}
            style={styles(theme).container}>
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
                    <ErrorBoundary
                        fallback={
                            <View style={styles(theme).overlayErrorContainer}>
                                <SvgImage
                                    name="Error"
                                    color={theme.colors.red}
                                    size={SvgImageSize.lg}
                                />
                                <Text style={styles(theme).overlayErrorText}>
                                    {t('errors.transaction-render-error')}
                                </Text>
                            </View>
                        }>
                        <TransactionDetail
                            txn={selectedTransaction}
                            handleCloseModal={() =>
                                setSelectedTransaction(null)
                            }
                            refreshTransactions={refreshTransactions}
                        />
                    </ErrorBoundary>
                )}
            </Overlay>
        </SafeAreaView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
        },
        overlayContainer: {
            borderRadius: theme.borders.defaultRadius,
            width: '90%',
            alignItems: 'center',
        },
        overlayErrorContainer: {
            paddingVertical: theme.spacing.xl,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        },
        overlayErrorText: {
            marginTop: theme.spacing.lg,
            textAlign: 'center',
        },
    })

export default TransactionsList
