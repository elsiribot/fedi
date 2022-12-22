import { Divider, Icon, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import {
    IncomingBitcoinTransactionStatus,
    Transaction,
    TransactionDirection,
} from '../../../bridge'
import { useBridge } from '../../../contexts/FederationsContext'
import amountUtils from '../../../utils/AmountUtils'
import dateUtils from '../../../utils/DateUtils'
import stringUtils from '../../../utils/StringUtils'

type TransactionDetailProps = {
    txn: Transaction
    handleCloseModal: () => void
}

const TransactionDetail = ({
    txn,
    handleCloseModal,
}: TransactionDetailProps) => {
    const { updateTransactionNotes } = useBridge()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [notes, setNotes] = useState(txn.notes)
    const onChangeNotes = (updatedNotes: string) => {
        setNotes(updatedNotes)
        updateTransactionNotes(txn.id, updatedNotes)
    }
    return (
        <View style={styles(theme).container}>
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
            <Text>
                {`${
                    txn.direction === TransactionDirection.send
                        ? t('feature.send.you-sent')
                        : t('feature.receive.you-received')
                }`}
            </Text>
            <Text h2>{`${amountUtils.msatToSat(txn.amount)} ${t(
                'words.sats',
            )}`}</Text>
            <View style={styles(theme).detailItemsContainer}>
                <Divider />
                {txn.bitcoin?.incomingStatus && (
                    <View>
                        <View style={styles(theme).detailItem}>
                            <Text>{`${t('words.status')}`}</Text>
                            {txn.bitcoin?.incomingStatus ===
                            IncomingBitcoinTransactionStatus.complete ? (
                                <Text>{`${t('words.complete')}`}</Text>
                            ) : (
                                <Text>{`${t('words.pending')}`}</Text>
                            )}
                        </View>
                        <Divider />
                    </View>
                )}
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.memo')}`}</Text>
                    <Text>{txn.notes}</Text>
                </View>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.time')}`}</Text>
                    <Text>{`${dateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd yyyy, h:mmaaa',
                    )}`}</Text>
                </View>
                <Divider />
                {txn.fee !== null && (
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('words.fee')}`}</Text>
                        <Text>{`${amountUtils.msatToSat(txn.fee)} ${t(
                            'words.sats',
                        )}`}</Text>
                    </View>
                )}
                <Divider />
                {txn.lightning && (
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('phrases.lightning-request')}`}</Text>
                        <Text>
                            {stringUtils.truncateMiddleOfString(
                                txn.lightning.invoice,
                                5,
                            )}
                        </Text>
                    </View>
                )}
                {txn.bitcoin && (
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('phrases.transaction-id')}`}</Text>
                        <Text>
                            {stringUtils.truncateMiddleOfString(
                                txn.bitcoin.txid,
                                5,
                            )}
                        </Text>
                    </View>
                )}
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('phrases.add-note')} +`}</Text>
                    {/* FIXME: this is terrible UX, probably shouldn't write on every keystroke */}
                    <Input
                        onChangeText={onChangeNotes}
                        value={notes}
                        returnKeyType="done"
                    />
                </View>
            </View>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            margin: theme.spacing.md,
            width: 300,
        },
        closeIconContainer: {
            alignSelf: 'flex-end',
        },
        detailItemsContainer: {
            marginTop: theme.spacing.xl,
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
