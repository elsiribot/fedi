import { Divider, Icon, Text, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import { Transaction, TransactionDirection } from '../../../bridge'
import amountUtils from '../../../utils/AmountUtils'
import DateUtils from '../../../utils/DateUtils'
import StringUtils from '../../../utils/StringUtils'

type TransactionDetailProps = {
    txn: Transaction
    handleCloseModal: () => void
}

const TransactionDetail = ({
    txn,
    handleCloseModal,
}: TransactionDetailProps) => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    console.log(txn)

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.closeIconContainer}
                onPress={handleCloseModal}>
                <Icon name="close" size={theme.sizes.md} />
            </TouchableOpacity>
            <Icon
                name="bitcoin"
                type="material-community"
                color={theme.colors.orange}
                size={theme.sizes.lg}
            />
            <Text>
                {`${
                    txn.direction === TransactionDirection.send
                        ? t('feature.send.you-sent')
                        : t('feature.receive.you-received')
                }`}
            </Text>
            <Text h3>{`${amountUtils.millisToSats(txn.amount)} ${t(
                'words.sats',
            )}`}</Text>
            <View style={styles.detailItemsContainer}>
                <Divider />
                <View style={styles.detailItem}>
                    <Text>{`${t('words.memo')}`}</Text>
                    {/* TODO: Replace with actual memo*/}
                    {/* <Text>{txn.memo}</Text> */}
                    <Text>{'Memo here'}</Text>
                </View>
                <Divider />
                <View style={styles.detailItem}>
                    <Text>{`${t('words.time')}`}</Text>
                    <Text>{`${DateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd yyyy, h:mmaaa',
                    )}`}</Text>
                </View>
                <Divider />
                <View style={styles.detailItem}>
                    <Text>{`${t('words.fee')}`}</Text>
                    {/* TODO: Replace with actual fee amount*/}
                    {/* <Text>{txn.feeSats}</Text> */}
                    <Text>{`${'~3 - 11'} ${t('words.sats')}`}</Text>
                </View>
                <Divider />
                {txn.method === 'lightning' && (
                    <View style={styles.detailItem}>
                        <Text>{`${t('phrases.lightning-request')}`}</Text>
                        <Text>
                            {StringUtils.truncateMiddleOfString(txn.invoice, 5)}
                        </Text>
                    </View>
                )}
                {txn.method === 'bitcoin' && (
                    <View style={styles.detailItem}>
                        <Text>{`${t('phrases.transaction-id')}`}</Text>
                        <Text>
                            {StringUtils.truncateMiddleOfString(txn.txid, 5)}
                        </Text>
                    </View>
                )}
                <Divider />
                <View style={styles.detailItem}>
                    <Text>{`${t('phrases.add-note')} +`}</Text>
                    <Text>{`${'Optional'}`}</Text>
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        margin: 10,
        width: 300,
    },
    closeIconContainer: {
        alignSelf: 'flex-end',
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
})

export default TransactionDetail
