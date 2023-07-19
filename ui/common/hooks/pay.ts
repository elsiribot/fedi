import { useCallback, useState } from 'react'

import {
    AnyParsedData,
    Invoice,
    ParsedLnurlPay,
    ParserDataType,
    Sats,
} from '../types'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'

const expectedOmniInputTypes = [
    ParserDataType.Bolt11,
    ParserDataType.LnurlPay,
] as const
type ExpectedInputData = Extract<
    AnyParsedData,
    { type: (typeof expectedOmniInputTypes)[number] }
>

interface OmniPaymentState {
    /** Whether or not an input has been entered that can be paid to */
    isReadyToPay: boolean
    /** The amount that must be sent with no ability to change, can be undefined */
    exactAmount: Sats | undefined
    /** The minimum amount that can be sent to an LNURL payment, can be undefined */
    minimumInputAmount: Sats | undefined
    /** The maximum amount that can be sent to an LNURL payment, can be undefined */
    maximumInputAmount: Sats | undefined
    /** A short description of the payment */
    description: string | undefined
    /** Handles sending the payment when the user has confirmed, can throw errors */
    handleOmniSend: (amount: Sats) => Promise<{ preimage: string }>
    /** For passing to <AmountInput amount /> prop or useAmountInput */
    inputAmount: Sats
    /** For passing to <AmountInput onChangeAmount /> prop useAmountInput */
    setInputAmount: (amount: Sats) => void
    /** For passing to the <OmniInput expectedInputTypes /> prop */
    expectedOmniInputTypes: typeof expectedOmniInputTypes
    /** For passing to the <OmniInput handleInput /> prop /> */
    handleOmniInput: (input: ExpectedInputData) => void
    /** For resetting all state */
    resetOmniPaymentState: () => void
}

/**
 * Handle validation and normalization of payment data between BOLT 11 invoices
 * and LNURL Payments. State from this is meant to be paired with useAmountInput
 * for inputting the amount for invoices or lnurl payments that have ambiguous
 * amounts to pay.
 */
export function useOmniPaymentState(
    fedimint: FedimintBridge,
    federationId: string | undefined,
): OmniPaymentState {
    const [invoice, setInvoice] = useState<Invoice>()
    const [lnurlPayment, setLnurlPayment] = useState<ParsedLnurlPay['data']>()
    const [inputAmount, setInputAmount] = useState<Sats>(0 as Sats)

    const handleOmniInput = useCallback(async (input: ExpectedInputData) => {
        if (input.type === ParserDataType.Bolt11) {
            const decoded = await fedimint.decodeInvoice(input.data.invoice)
            setInvoice(decoded)
            if (decoded.amount) {
                setInputAmount(amountUtils.msatToSat(decoded.amount))
            }
        } else if (input.type === ParserDataType.LnurlPay) {
            setLnurlPayment(input.data)
            if (input.data.minSendable) {
                setInputAmount(amountUtils.msatToSat(input.data.minSendable))
            }
        }
    }, [])

    const handleOmniSend = useCallback(
        async (amount: Sats) => {
            if (!federationId) {
                throw new Error('Must have a federation ID to send')
            }
            if (!invoice && !lnurlPayment) {
                throw new Error('Requires invoice or lnurl payment to send')
            }

            let bolt11 = ''
            if (invoice) {
                bolt11 = invoice.invoice
            } else if (lnurlPayment) {
                const url = new URL(lnurlPayment.callback)
                url.searchParams.set('amount', amount.toString())
                bolt11 = await fetch(url)
                    .then(r => r.json())
                    .then(r => r.pr)
            }
            // TODO: Pass amount to `payInvoice` once it's supported, otherwise zero-amount BOLT-11 don't work
            return fedimint.payInvoice(bolt11, federationId)
        },
        [invoice, lnurlPayment, federationId],
    )

    const resetOmniPaymentState = useCallback(() => {
        setInvoice(undefined)
        setLnurlPayment(undefined)
        setInputAmount(0 as Sats)
    }, [])

    let exactAmount: Sats | undefined
    let minimumInputAmount: Sats | undefined
    let maximumInputAmount: Sats | undefined
    let description: string | undefined
    if (invoice) {
        exactAmount = invoice.amount
            ? amountUtils.msatToSat(invoice.amount)
            : undefined
        description = invoice.description
    } else if (lnurlPayment) {
        minimumInputAmount =
            lnurlPayment.minSendable &&
            amountUtils.msatToSat(lnurlPayment.minSendable)
        maximumInputAmount =
            lnurlPayment.maxSendable &&
            amountUtils.msatToSat(lnurlPayment.maxSendable)
        if (minimumInputAmount === maximumInputAmount && !!minimumInputAmount) {
            exactAmount = minimumInputAmount
        }
        description = lnurlPayment.description
    }

    return {
        isReadyToPay: !!invoice || !!lnurlPayment,
        exactAmount,
        minimumInputAmount,
        maximumInputAmount,
        description,
        handleOmniSend,
        inputAmount,
        setInputAmount,
        expectedOmniInputTypes,
        handleOmniInput,
        resetOmniPaymentState,
    }
}
