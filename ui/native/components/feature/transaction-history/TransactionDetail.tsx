import { Input, Text, Theme, useTheme } from '@rneui/themed'
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

import { Transaction } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'
import {
    makeTxnDetailStatusText,
    makeTxnDetailTitleText,
} from '@fedi/common/utils/wallet'

import { useBridge } from '../../../state/hooks'
import SvgImage, { SvgImageSize } from '../../ui/SvgImage'
import { TransactionDetailItem } from './TransactionDetailItem'
import { TransactionIcon } from './TransactionIcon'

type TransactionDetailProps = {
    txn: Transaction
    handleCloseModal: () => void
    updateTransactionInState: (
        transactionId: string,
        updatedNotes: string,
    ) => void
}

const TransactionDetail = ({
    txn,
    handleCloseModal,
    updateTransactionInState,
}: TransactionDetailProps) => {
    const inputRef = useRef<TextInput | null>(null)
    const { updateTransactionNotes } = useBridge()
    const { theme } = useTheme()
    const { t } = useTranslation()
    const [notes, setNotes] = useState(txn.notes)
    const [isFocused, setIsFocused] = useState(false)

    const onNotesInputChanged = (input: string) => {
        setNotes(input)
    }

    const submitUpdatedNote = async () => {
        await updateTransactionNotes(txn.id, notes)
        updateTransactionInState(txn.id, notes)
    }

    const txnFee = txn.lightning?.fee || null
    const style = styles(theme)

    const renderTxnDetails = () => {
        if (txn.lightning) {
            return (
                <TransactionDetailItem
                    label={t('phrases.lightning-request')}
                    value={txn.lightning.invoice}
                    copiedMessage={t('phrases.copied-lightning-request')}
                    copyable
                    truncated
                />
            )
        } else {
            let txidDetailItem = null
            if (txn.onchainState && 'txid' in txn.onchainState) {
                txidDetailItem = (
                    <TransactionDetailItem
                        label={t('phrases.transaction-id')}
                        value={txn.onchainState.txid}
                        copiedMessage={t('phrases.copied-transaction-id')}
                        copyable
                        truncated
                    />
                )
            }

            return (
                <>
                    {txn.bitcoin && (
                        <TransactionDetailItem
                            label={
                                txn.onchainState?.type ===
                                'waitingForTransaction'
                                    ? t('words.address')
                                    : t('words.to')
                            }
                            value={txn.bitcoin.address}
                            copiedMessage={t('phrases.copied-bitcoin-address')}
                            copyable
                            truncated
                        />
                    )}
                    {txidDetailItem}
                </>
            )
        }
    }

    return (
        <Pressable style={style.container} onPress={Keyboard.dismiss}>
            <TouchableOpacity
                style={style.closeIconContainer}
                onPress={() => {
                    submitUpdatedNote()
                    handleCloseModal()
                }}>
                <SvgImage name="Close" size={SvgImageSize.md} />
            </TouchableOpacity>
            <TransactionIcon txn={txn} />
            <Text style={style.detailTitle}>
                {makeTxnDetailTitleText(t, txn)}
            </Text>
            {txn.amount !== 0 && (
                <Text h2>{`${amountUtils.formatNumber(
                    amountUtils.msatToSat(txn.amount),
                )} ${t('words.sats')}`}</Text>
            )}
            <View style={style.detailItemsContainer}>
                <TransactionDetailItem
                    label={t('words.time')}
                    value={dateUtils.formatTimestamp(
                        txn.createdAt,
                        'MMM dd yyyy, h:mmaaa',
                    )}
                />
                {renderTxnDetails()}
                {txnFee !== null && (
                    <TransactionDetailItem
                        label={t('words.fee')}
                        value={`${amountUtils.msatToSat(txnFee)} ${t(
                            'words.sats',
                        )}`}
                    />
                )}
                <TransactionDetailItem
                    label={t('words.status')}
                    value={makeTxnDetailStatusText(t, txn)}
                />
                {/* TODO: Separate memo from notes, since LN invoices have their own memos
                <TransactionDetailItem
                    label={t('words.memo')}
                    value={txn.notes}
                />
                */}
                <TransactionDetailItem
                    label={`${t('phrases.add-note')} +`}
                    value={
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
                            containerStyle={style.inputOuterContainer}
                            inputContainerStyle={[
                                style.inputInnerContainer,
                                isFocused
                                    ? style.focusedInputInnerContainer
                                    : {},
                            ]}
                            inputStyle={[
                                style.input,
                                isFocused ? style.focusedInput : {},
                            ]}
                            multiline
                        />
                    }
                    onPress={() => {
                        if (!inputRef.current) return
                        const current: TextInput = inputRef.current
                        current.focus()
                    }}
                />
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
            width: '100%',
        },
        closeIconContainer: {
            alignSelf: 'flex-end',
        },
        detailItemsContainer: {
            marginTop: theme.spacing.xl,
            gap: theme.spacing.xs,
            width: '100%',
        },
        detailTitle: {
            marginVertical: theme.spacing.sm,
        },
        inputOuterContainer: {
            flex: 1,
            height: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: 0,
            minHeight: 0,
        },
        inputInnerContainer: {
            borderBottomColor: 'transparent',
            width: '100%',
            height: 'auto',
            minHeight: 0,
        },
        focusedInputInnerContainer: {
            borderBottomColor: theme.colors.primary,
        },
        input: {
            fontSize: 12,
            textAlign: 'right',
            minHeight: 0,
        },
        focusedInput: {
            // marginBottom: 0,
        },
    })

export default TransactionDetail
