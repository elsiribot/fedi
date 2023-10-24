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

import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'
import stringUtils from '@fedi/common/utils/StringUtils'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useBridge } from '../../../state/hooks'
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

    const txnFee = txn.lightning?.fee || null

    const renderTitle = () => {
        if (txn.direction === TransactionDirection.send) {
            return t('feature.send.you-sent')
        }
        if (txn.lightning) {
            if (!txn.lnState) return `${t('phrases.receive-pending')}`
            switch (txn.lnState.type) {
                case 'waitingForPayment':
                    return t('phrases.receive-pending')
                case 'claimed':
                    return t('feature.receive.you-received')
                case 'canceled':
                    return t('words.canceled')
                default:
                    return t('phrases.receive-pending')
            }
        } else if (txn.bitcoin) {
            switch (txn.onchainState?.type) {
                case 'waitingForTransaction':
                    return t('phrases.address-created')
                case 'claimed':
                    return t('feature.receive.you-received')
                default:
                    return t('phrases.receive-pending')
            }
        } else {
            return t('feature.receive.you-received')
        }
    }
    console.debug('txn', txn)

    const renderStatus = () => {
        if (txn.direction === TransactionDirection.send) {
            return t('words.sent')
        }
        if (txn.lightning) {
            if (!txn.lnState) {
                return t('words.pending')
            } else {
                switch (txn.lnState.type) {
                    case 'waitingForRefund':
                        return t('feature.send.refund-in-block', {
                            block: txn.lnState.block_height,
                        })
                    case 'waitingForPayment':
                        return t('words.pending')
                    case 'claimed':
                        return t('words.complete')
                    case 'canceled':
                        return t('words.canceled')
                    default:
                        return txn.lnState?.type!
                }
            }
        } else if (txn.bitcoin) {
            switch (txn.onchainState?.type) {
                case 'waitingForTransaction':
                    return t('words.pending')
                case 'waitingForConfirmation':
                    return t('words.seen')
                case 'confirmed':
                    return t('words.seen')
                case 'claimed':
                    return t('words.complete')
                default:
                    return txn.onchainState?.type!
            }
        } else {
            return t('words.unknown')
        }
    }

    const renderTxnDetails = () => {
        if (txn.lightning) {
            return (
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('phrases.lightning-request')}`}</Text>
                    <Pressable
                        style={styles(theme).detailItem}
                        onPress={() => {
                            Clipboard.setString(txn.lightning?.invoice!)
                            toast?.show(t('phrases.copied-lightning-request'))
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
            )
        } else {
            let txidDetailItem = null
            if (txn.onchainState && 'txid' in txn.onchainState) {
                const txid = txn.onchainState.txid
                txidDetailItem = (
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('phrases.transaction-id')}`}</Text>
                        <Pressable
                            style={styles(theme).detailItem}
                            onPress={() => {
                                Clipboard.setString(txid!)
                                toast?.show(t('phrases.copied-transaction-id'))
                            }}>
                            <Text>
                                {stringUtils.truncateMiddleOfString(txid, 5)}
                            </Text>
                            <SvgImage name="Copy" size={SvgImageSize.sm} />
                        </Pressable>
                    </View>
                )
            }

            return (
                <>
                    {txn.bitcoin && (
                        <View style={styles(theme).detailItem}>
                            <Text>
                                {txn.onchainState?.type ===
                                'waitingForTransaction'
                                    ? t('words.address')
                                    : t('words.to')}
                            </Text>
                            <Pressable
                                style={styles(theme).detailItem}
                                onPress={() => {
                                    Clipboard.setString(txn.bitcoin?.address!)
                                    toast?.show(
                                        t('phrases.copied-bitcoin-address'),
                                    )
                                }}>
                                <Text>
                                    {stringUtils.truncateMiddleOfString(
                                        txn.bitcoin.address,
                                        5,
                                    )}
                                </Text>
                                <SvgImage name="Copy" size={SvgImageSize.sm} />
                            </Pressable>
                        </View>
                    )}
                    {txidDetailItem}
                </>
            )
        }
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
                name="BitcoinCircle"
                size={SvgImageSize.lg}
                color={theme.colors.orange}
            />
            <Text style={styles(theme).detailTitle}>{renderTitle()}</Text>
            {txn.amount !== 0 && (
                <Text h2>{`${amountUtils.formatNumber(
                    amountUtils.msatToSat(txn.amount),
                )} ${t('words.sats')}`}</Text>
            )}
            <View style={styles(theme).detailItemsContainer}>
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.time')}`}</Text>
                    <Text>{`${dateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd yyyy, h:mmaaa',
                    )}`}</Text>
                </View>
                <Divider />
                {txnFee !== null && (
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('words.fee')}`}</Text>
                        <Text>{`${amountUtils.msatToSat(txnFee)} ${t(
                            'words.sats',
                        )}`}</Text>
                    </View>
                )}
                <View>
                    <View style={styles(theme).detailItem}>
                        <Text>{`${t('words.status')}`}</Text>
                        <Text>{renderStatus()}</Text>
                    </View>
                    <Divider />
                </View>
                {renderTxnDetails()}
                <Divider />
                <View style={styles(theme).detailItem}>
                    <Text>{`${t('words.memo')}`}</Text>
                    {/* TODO: Refactor notes to be distinct from memo */}
                    <Text>{txn.notes}</Text>
                </View>
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
        detailTitle: {
            marginVertical: theme.spacing.sm,
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
