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
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

import { ErrorBoundary } from '@fedi/common/components/ErrorBoundary'
import type { StabilityPoolTxn } from '@fedi/common/types'

import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import StabilityTransactionDetail from './StabilityTransactionDetail'
import StabilityTransactionTile from './StabilityTransactionTile'
import { StabilityTransactionTileError } from './StabilityTransactionTileError'

type StabilityTransactionsListProps = {
    transactions: StabilityPoolTxn[]
    refreshTransactions: () => void
}

const WINDOW_WIDTH = Dimensions.get('window').width

const StabilityTransactionsList = ({
    transactions,
    refreshTransactions,
}: StabilityTransactionsListProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const insets = useSafeAreaInsets()
    const [selectedTransaction, setSelectedTransaction] =
        useState<StabilityPoolTxn | null>(null)

    const renderTransaction: ListRenderItem<StabilityPoolTxn> = ({ item }) => {
        return (
            <ErrorBoundary fallback={() => <StabilityTransactionTileError />}>
                <StabilityTransactionTile
                    txn={item}
                    selectTransaction={(txn: StabilityPoolTxn) =>
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
                contentContainerStyle={style.listContent}
                keyExtractor={(item: StabilityPoolTxn) => `${item.id}`}
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
                        <StabilityTransactionDetail
                            txn={selectedTransaction}
                            handleCloseModal={() =>
                                setSelectedTransaction(null)
                            }
                            refreshTransactions={refreshTransactions}
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
        listContent: {
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingBottom: Math.max(theme.spacing.lg, insets.bottom),
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

export default StabilityTransactionsList
