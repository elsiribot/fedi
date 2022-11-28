import {
    Divider,
    Icon,
    ListItem,
    Overlay,
    Text,
    Theme,
    useTheme,
} from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Transaction } from '../bridge'
import DateUtils from '../utils/DateUtils'
import StringUtils from '../utils/StringUtils'

type TransactionsListProps = {
    transactions: Transaction[]
}

type TransactionTileProps = {
    txn: Transaction
    selectTransaction: (txn: Transaction) => void
}

type TransactionDetailProps = {
    txn: Transaction
    handleCloseModal: () => void
}

const WINDOW_WIDTH = Dimensions.get('window').width

const TransactionTile = ({ txn, selectTransaction }: TransactionTileProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()

    return (
        <TouchableOpacity
            onPress={() => selectTransaction(txn)}
            style={[
                styles(theme).tileContainer,
                // TODO: Add opacity based on "pending" state for onchain txns
                // {
                //     opacity: txn.pending ? 0.6 : 1,
                // },
            ]}>
            <View style={styles(theme).leftContainer}>
                <Icon
                    name="bitcoin"
                    type="material-community"
                    color={theme.colors.orange}
                    size={theme.sizes.md}
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
                    style={[
                        styles(theme).rightAlignedText,
                        styles(theme).subText,
                    ]}>
                    {`${DateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd, h:mmaaa',
                    )}`}
                </Text>
            </View>
        </TouchableOpacity>
    )
}

const TransactionDetail = ({
    txn,
    handleCloseModal,
}: TransactionDetailProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    console.log(txn)

    return (
        <View style={styles(theme).detailContainer}>
            <TouchableOpacity
                style={styles(theme).closeIconContainer}
                onPress={handleCloseModal}>
                <Icon name="close" size={theme.sizes.md} />
            </TouchableOpacity>
            <Icon
                name="bitcoin"
                type="material-community"
                color={theme.colors.orange}
                size={theme.sizes.lg}
            />
            <Text h3>{`${t('feature.receive.you-received')}`}</Text>
            <Text h3>{`${txn.amountSats} ${t('words.sats')}`}</Text>
            <View style={styles(theme).detailItemsContainer}>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.memo')}`}</Text>
                    {/* TODO: Replace with actual memo*/}
                    {/* <Text>{txn.memo}</Text> */}
                    <Text>{`Memo here`}</Text>
                </View>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.time')}`}</Text>
                    <Text>{`${DateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd yyyy, h:mmaaa',
                    )}`}</Text>
                </View>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.fee')}`}</Text>
                    {/* TODO: Replace with actual fee amount*/}
                    {/* <Text>{txn.feeSats}</Text> */}
                    <Text>{`${'~3 - 11'} ${t('words.sats')}`}</Text>
                </View>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('phrases.lightning-request')}`}</Text>
                    {/* TODO: Replace with actual invoice string*/}
                    {/* <Text>{StringUtils.truncateMiddleOfString(txn.invoice, 5)}</Text> */}
                    <Text>{`${'lnbc1...o19n382x'}`}</Text>
                </View>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('phrases.add-note')} +`}</Text>
                    <Text>{`${'Optional'}`}</Text>
                </View>
            </View>
        </View>
    )
}
const TransactionsList = ({ transactions }: TransactionsListProps) => {
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
        closeIconContainer: {
            alignSelf: 'flex-end',
        },
        detailContainer: {
            alignItems: 'center',
            margin: 10,
            width: 300,
        },
        detailItemsContainer: {
            marginTop: 20,
            width: 250,
        },
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 32,
        },
        overlayContainer: {
            borderRadius: 20,
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
        subText: {
            fontSize: theme.sizes.xs,
            opa: theme.colors.primaryLight,
        },
    })

export default TransactionsList
