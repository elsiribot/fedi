import { useCallback, useState } from 'react'

import {
    AnyParsedData,
    Invoice,
    ParsedLnurlPay,
    ParserDataType,
    Sats,
} from '../types'
import { RpcFeeDetails } from '../types/bindings'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'
import { lnurlPay } from '../utils/lnurl'
import { useSendForm } from './amount'

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
    /** The minimum amount that can be sent */
    minimumAmount: Sats
    /** The maximum amount that can be sent */
    maximumAmount: Sats
    /** A short description of the payment */
    description: string | undefined
    /** The fees associated with the payment */
    feeDetails: RpcFeeDetails | undefined
    /** Describes where the payment is being sent to (LN invoice, chat username, bitcoin address, etc) */
    sendTo: string | undefined
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
    const {
        inputAmount,
        setInputAmount,
        exactAmount,
        minimumAmount,
        maximumAmount,
        description,
        feeDetails,
        sendTo,
    } = useSendForm({ invoice, lnurlPayment })

    const handleOmniInput = useCallback(
        async (input: ExpectedInputData) => {
            if (input.type === ParserDataType.Bolt11 && federationId) {
                const decoded = await fedimint.decodeInvoice(
                    input.data.invoice,
                    federationId,
                )
                if (decoded.amount) {
                    setInputAmount(amountUtils.msatToSat(decoded.amount))
                }
                setInvoice(decoded)
            } else if (input.type === ParserDataType.LnurlPay) {
                if (input.data.minSendable) {
                    setInputAmount(
                        amountUtils.msatToSat(input.data.minSendable),
                    )
                }
                setLnurlPayment(input.data)
            }
        },
        [federationId, fedimint, setInputAmount],
    )

    const handleOmniSend = useCallback(
        async (amount: Sats) => {
            if (!federationId) {
                throw new Error('Must have a federation ID to send')
            }
            if (invoice) {
                return fedimint.payInvoice(invoice.invoice, federationId)
            } else if (lnurlPayment) {
                return lnurlPay(
                    fedimint,
                    federationId,
                    lnurlPayment,
                    amountUtils.satToMsat(amount),
                )
            } else {
                throw new Error('Requires invoice or lnurl payment to send')
            }
        },
        [invoice, lnurlPayment, federationId, fedimint],
    )

    const resetOmniPaymentState = useCallback(() => {
        setInvoice(undefined)
        setLnurlPayment(undefined)
        setInputAmount(0 as Sats)
    }, [setInputAmount])

    return {
        isReadyToPay: !!invoice || !!lnurlPayment,
        exactAmount,
        minimumAmount,
        maximumAmount,
        feeDetails,
        description,
        sendTo,
        handleOmniSend,
        inputAmount,
        setInputAmount,
        expectedOmniInputTypes,
        handleOmniInput,
        resetOmniPaymentState,
    }
}
