import { Overlay, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FlatList, ListRenderItem, StyleSheet, View } from 'react-native'
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import type { Transaction } from '@fedi/common/types'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import TransactionDetail from './TransactionDetail'
import TransactionTile from './TransactionTile'
import { TransactionTileError } from './TransactionTileError'

type TransactionsListProps = {
    transactions: Transaction[]
    isV1Federation: boolean
    loadMoreTransactions?: () => void
    updateTransactionInState: (
        transactionId: string,
        updatedNotes: string,
    ) => void
}

const TransactionsList = ({
    transactions,
    isV1Federation,
    loadMoreTransactions,
    updateTransactionInState,
}: TransactionsListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
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

    const style = styles(theme, insets)

    return (
        <View style={style.container}>
            <FlatList
                data={transactions}
                renderItem={renderTransaction}
                contentContainerStyle={style.content}
                keyExtractor={(item: Transaction) => `${item.id}`}
                // optimization that allows skipping the measurement of dynamic content
                // for fixed-size list items
                getItemLayout={(_, index) => ({
                    length: 56, // 38 height + 16 margin
                    offset: 56 * index,
                    index,
                })}
                initialNumToRender={20}
                onEndReached={isV1Federation ? loadMoreTransactions : undefined}
                onEndReachedThreshold={0.9}
            />
            <Overlay
                isVisible={selectedTransaction !== null}
                overlayStyle={style.overlayContainer}
                onBackdropPress={() => setSelectedTransaction(null)}>
                {selectedTransaction && (
                    <ErrorBoundary
                        fallback={
                            <View style={style.overlayErrorContainer}>
                                <SvgImage
                                    name="Error"
                                    color={theme.colors.red}
                                    size={SvgImageSize.lg}
                                />
                                <Text style={style.overlayErrorText}>
                                    {t('errors.transaction-render-error')}
                                </Text>
                            </View>
                        }>
                        <TransactionDetail
                            txn={selectedTransaction}
                            handleCloseModal={() =>
                                setSelectedTransaction(null)
                            }
                            updateTransactionInState={updateTransactionInState}
                        />
                    </ErrorBoundary>
                )}
            </Overlay>
        </View>
    )
}

const styles = (theme: Theme, insets: EdgeInsets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            width: '100%',
        },
        content: {
            paddingTop: theme.spacing.xl,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: Math.min(insets.bottom, theme.spacing.lg),
        },
        overlayContainer: {
            width: '90%',
            maxWidth: 340,
            padding: theme.spacing.xl,
            borderRadius: theme.borders.defaultRadius,
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
