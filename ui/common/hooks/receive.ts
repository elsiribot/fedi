import { useCallback, useEffect, useMemo, useState } from 'react'

import { Sats, TransactionListEntry } from '../types'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { useTransactionHistory } from './transactions'

const log = makeLog('common/hooks/lightning')

type LnReceiveTxn = Extract<TransactionListEntry, { kind: 'lnReceive' }>

/**
 * Handles the logic for creating and subscribing to a lightning request.
 *
 * Exposes the necessary state variables/options to handle error/loading states.
 */
export const useMakeLightningRequest = ({
    fedimint,
    federationId,
    onInvoicePaid,
}: {
    fedimint: FedimintBridge
    federationId: string | undefined
    onInvoicePaid?: (transaction: LnReceiveTxn) => void
}) => {
    const [invoice, setInvoice] = useState<string | null>(null)
    const [isInvoiceLoading, setIsInvoiceLoading] = useState<boolean>(false)

    const reset = useCallback(() => {
        setInvoice(null)
        setIsInvoiceLoading(false)
    }, [])

    const makeLightningRequest = useCallback(
        async (amount: Sats, memo: string = '') => {
            if (!federationId) return
            setIsInvoiceLoading(true)
            try {
                const inv = await fedimint.generateInvoice(
                    amountUtils.satToMsat(amount),
                    memo,
                    federationId,
                    null,
                    {
                        initialNotes: memo || null,
                        recipientMatrixId: null,
                        senderMatrixId: null,
                    },
                )

                setInvoice(inv)

                return inv
            } catch (e) {
                log.error('Failed to make lightning request', e)
                throw e
            } finally {
                setIsInvoiceLoading(false)
            }
        },
        [federationId, fedimint],
    )

    useEffect(() => {
        if (!invoice || !onInvoicePaid) return

        const unsubscribe = fedimint.addListener('transaction', event => {
            if (
                event.transaction.kind === 'lnReceive' &&
                event.transaction.ln_invoice === invoice
            ) {
                onInvoicePaid?.(event.transaction as LnReceiveTxn)
            }
        })

        return unsubscribe
    }, [invoice, fedimint, onInvoicePaid])

    return {
        makeLightningRequest,
        invoice,
        isInvoiceLoading,
        reset,
    }
}

type OnchainDepositTxn = Extract<
    TransactionListEntry,
    { kind: 'onchainDeposit' }
>

/**
 * Handles the logic for creating an onchain address and subscribing to a mempool transaction for that address.
 *
 * Exposes the necessary state variables/options to handle error/loading states and add transaction notes.
 */
export const useMakeOnchainAddress = ({
    federationId,
    fedimint,
    onMempoolTransaction,
}: {
    fedimint: FedimintBridge
    federationId: string | undefined
    onMempoolTransaction?: (txn: OnchainDepositTxn) => void
}) => {
    const [address, setAddress] = useState<string | null>(null)
    const [isAddressLoading, setIsAddressLoading] = useState<boolean>(false)

    const { transactions, fetchTransactions } = useTransactionHistory(
        fedimint,
        federationId || '',
    )

    const transaction = useMemo(
        () =>
            transactions.find(
                tx =>
                    tx.kind === 'onchainDeposit' &&
                    tx.onchain_address === address,
            ) as OnchainDepositTxn | undefined,
        [transactions, address],
    )

    const reset = useCallback(() => {
        setAddress(null)
        setIsAddressLoading(false)
    }, [])

    const makeOnchainAddress = useCallback(async () => {
        if (!federationId) return

        setIsAddressLoading(true)
        try {
            const newAddress = await fedimint.generateAddress(federationId, {
                initialNotes: null,
                recipientMatrixId: null,
                senderMatrixId: null,
            })
            setAddress(newAddress)

            // Fetches transactionId of new address, in case the user updates notes
            await fetchTransactions()
        } catch (e) {
            log.error('error generating address', e)
            throw e
        } finally {
            setIsAddressLoading(false)
        }
    }, [federationId, fedimint, fetchTransactions])

    const onSaveNotes = useCallback(
        async (notes: string) => {
            if (!transaction || !federationId) return

            try {
                await fedimint.updateTransactionNotes(
                    transaction.id,
                    notes,
                    federationId,
                )
            } catch (e) {
                log.error(
                    `Failed to update notes for transaction ${transaction.id}`,
                    e,
                )
                throw e
            }
        },
        [federationId, transaction, fedimint],
    )

    useEffect(() => {
        if (!address || !onMempoolTransaction) return

        const unsubscribe = fedimint.addListener('transaction', event => {
            if (
                event.transaction.kind === 'onchainDeposit' &&
                event.transaction.onchain_address === address
            ) {
                onMempoolTransaction?.(event.transaction as OnchainDepositTxn)
            }
        })

        return unsubscribe
    }, [fedimint, onMempoolTransaction, address])

    return {
        address,
        isAddressLoading,
        makeOnchainAddress,
        transaction,
        onSaveNotes,
        reset,
    }
}
