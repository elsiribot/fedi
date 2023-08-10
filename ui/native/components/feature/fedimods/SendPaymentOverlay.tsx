import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RejectionError } from 'webln'

import { useSendForm } from '@fedi/common/hooks/amount'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { lnurlPay } from '@fedi/common/utils/lnurl'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import {
    useAppSelector,
    useBridge,
    useBtcFiatPrice,
} from '../../../state/hooks'
import { FediMod, Invoice, ParsedLnurlPay } from '../../../types'
import AmountInput from '../../ui/AmountInput'
import CustomOverlay from '../../ui/CustomOverlay'

interface Props {
    fediMod: FediMod
    invoice?: Invoice | null
    lnurlPayment?: ParsedLnurlPay['data'] | null
    onReject: (err: Error) => void
    onAccept: (res: { preimage: string }) => void
}

export const SendPaymentOverlay: React.FC<Props> = ({
    fediMod,
    invoice,
    lnurlPayment,
    onReject,
    onAccept,
}) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const { payInvoice } = useBridge()
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const federationId = useAppSelector(selectActiveFederation)?.id
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [amountInputKey, setAmountInputKey] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const onRejectRef = useUpdatingRef(onReject)
    const onAcceptRef = useUpdatingRef(onAccept)
    const {
        inputAmount,
        setInputAmount,
        exactAmount,
        minimumAmount,
        maximumAmount,
        reset,
    } = useSendForm({ invoice, lnurlPayment })

    // Reset form when it appears, requires a key bump to flush state.
    const isShowing = Boolean(invoice || lnurlPayment)
    useEffect(() => {
        if (isShowing) {
            reset()
            setAmountInputKey(key => key + 1)
        }
    }, [isShowing, reset])

    const handleAccept = async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) {
            return
        }

        setIsLoading(true)
        try {
            if (!federationId) throw new Error()
            if (invoice) {
                const res = await payInvoice(invoice.invoice)
                onAcceptRef.current(res)
            } else if (lnurlPayment) {
                const res = await lnurlPay(
                    fedimint,
                    federationId,
                    lnurlPayment,
                    amountUtils.satToMsat(inputAmount),
                )
                onAcceptRef.current(res)
            }
        } catch (error) {
            toast?.show(
                formatErrorMessage(t, error, 'errors.unknown-error'),
                3000,
            )
            onRejectRef.current(error as Error)
        }
        setIsLoading(false)
    }

    const handleReject = () => {
        onRejectRef.current(
            new RejectionError(t('errors.webln-payment-rejected')),
        )
    }

    let message: string | undefined
    let description: string | undefined
    let body: React.ReactNode = null
    if (exactAmount) {
        message = `${amountUtils.formatNumber(inputAmount)} ${t(
            'words.sats',
        ).toUpperCase()}`
        description = convertSatsToFormattedFiat(inputAmount)
    } else {
        body = (
            <AmountInput
                key={amountInputKey}
                amount={inputAmount}
                submitAttempts={submitAttempts}
                minimumAmount={minimumAmount}
                maximumAmount={maximumAmount}
                verb={t('words.send')}
                onChangeAmount={amount => {
                    setSubmitAttempts(0)
                    setInputAmount(amount)
                }}
            />
        )
    }

    return (
        <CustomOverlay
            show={isShowing}
            loading={isLoading}
            onBackdropPress={() =>
                onReject(new RejectionError(t('errors.webln-canceled')))
            }
            contents={{
                title: t('feature.fedimods.payment-request', {
                    fediMod: fediMod.title,
                }),
                message,
                description,
                body,
                buttons: [
                    {
                        text: t('words.reject'),
                        onPress: handleReject,
                    },
                    {
                        primary: true,
                        text: t('words.accept'),
                        onPress: handleAccept,
                    },
                ],
            }}
        />
    )
}
