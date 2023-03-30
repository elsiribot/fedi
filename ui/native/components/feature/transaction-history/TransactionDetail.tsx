import Clipboard from '@react-native-clipboard/clipboard'
import { Divider, Input, Text, Theme, useTheme } from '@rneui/themed'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
    Keyboard,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'

import {
    IncomingBitcoinTransactionStatus,
    Transaction,
    TransactionDirection,
} from '../../../bridge'
import { useBridge } from '../../../state/hooks'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'
import stringUtils from '@fedi/common/utils/StringUtils'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'

type TransactionDetailProps = {
    txn: Transaction
    handleCloseModal: () => void
    refreshTransactions: () => void
}

const TransactionDetail = ({
    txn,
    handleCloseModal,
    refreshTransactions,
}: TransactionDetailProps) => {
    const inputRef = useRef<TextInput | null>(null)
    const { updateTransactionNotes } = useBridge()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [notes, setNotes] = useState(txn.notes)
    const [isFocused, setIsFocused] = useState(false)
    const { toast } = useEnvironmentContext().state

    const onNotesInputChanged = (input: string) => {
        setNotes(input)
    }

    const submitUpdatedNote = async () => {
        await updateTransactionNotes(txn.id, notes)
        refreshTransactions()
    }

    return (
        <Pressable style={styles(theme).container} onPress={Keyboard.dismiss}>
            <TouchableOpacity
                style={styles(theme).closeIconContainer}
                onPress={() => {
                    submitUpdatedNote()
                    handleCloseModal()
                }}>
                <SvgImage name="Close" size={SvgImageSize.md} />
            </TouchableOpacity>
            <SvgImage
                name="Bitcoin"
                size={SvgImageSize.lg}
                color={theme.colors.orange}
            />
            <Text>
                {`${
                    txn.direction === TransactionDirection.send
                        ? t('feature.send.you-sent')
                        : t('feature.receive.you-received')
                }`}
            </Text>
            <Text h2>{`${amountUtils.formatNumber(
                amountUtils.msatToSat(txn.amount),
            )} ${t('words.sats')}`}</Text>
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
                                <Text>
                                    {`${t('words.pending').toLowerCase()}`}
                                </Text>
                            )}
                        </View>
                        <Divider />
                    </View>
                )}
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.memo')}`}</Text>
                    {/* TODO: Refactor notes to be distinct from memo */}
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
                        <Pressable
                            style={styles(theme).detailItem}
                            onPress={() => {
                                Clipboard.setString(txn.lightning?.invoice!)
                                toast?.show(
                                    t(
                                        'feature.wallet.copied-lightning-request',
                                    ),
                                )
                            }}>
                            <Text>
                                {stringUtils.truncateMiddleOfString(
                                    txn.lightning.invoice,
                                    5,
                                )}
                            </Text>
                            <SvgImage name="Copy" size={SvgImageSize.sm} />
                        </Pressable>
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
                <Pressable
                    style={styles(theme).detailItem}
                    onPress={() => {
                        if (!inputRef.current) return
                        const current: TextInput = inputRef.current
                        current.focus()
                    }}>
                    <Text>{`${t('phrases.add-note')} +`}</Text>
                    <Input
                        ref={(ref: any) => {
                            inputRef.current = ref
                        }}
                        onChangeText={onNotesInputChanged}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            setIsFocused(false)
                            submitUpdatedNote()
                        }}
                        value={notes}
                        placeholder={t('words.optional')}
                        returnKeyType="done"
                        containerStyle={styles(theme).inputOuterContainer}
                        inputContainerStyle={[
                            styles(theme).inputInnerContainer,
                            isFocused
                                ? styles(theme).focusedInputInnerContainer
                                : {},
                        ]}
                        inputStyle={[
                            styles(theme).input,
                            isFocused ? styles(theme).focusedInput : {},
                        ]}
                    />
                </Pressable>
            </View>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        icon: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        container: {
            alignItems: 'center',
            margin: theme.spacing.md,
            width: '100%',
        },
        closeIconContainer: {
            alignSelf: 'flex-end',
        },
        detailItemsContainer: {
            marginTop: theme.spacing.xl,
            width: '90%',
        },
        detailItem: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 36,
        },
        inputOuterContainer: {
            width: '70%',
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 0,
        },
        inputInnerContainer: {
            borderBottomColor: 'transparent',
            height: '100%',
            width: '100%',
        },
        focusedInputInnerContainer: {
            borderBottomColor: theme.colors.primary,
        },
        input: {
            fontSize: 14,
            textAlign: 'right',
        },
        focusedInput: {
            // marginBottom: 0,
        },
    })

export default TransactionDetail
