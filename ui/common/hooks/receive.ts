import { useCallback, useEffect, useState } from 'react'

import { Sats, TransactionListEntry } from '../types'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'

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
