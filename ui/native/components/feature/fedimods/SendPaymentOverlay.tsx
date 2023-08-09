import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RejectionError } from 'webln'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useBridge, useBtcFiatPrice } from '../../../state/hooks'
import { FediMod, Invoice, ParsedLnurlPay, Sats } from '../../../types'
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
    const [isLoading, setIsLoading] = useState(false)
    const onRejectRef = useUpdatingRef(onReject)
    const onAcceptRef = useUpdatingRef(onAccept)

    const handleAccept = useCallback(async () => {
        setIsLoading(true)
        try {
            if (!invoice) throw new Error()
            const res = await payInvoice(invoice.invoice)
            onAcceptRef.current(res)
        } catch (error) {
            toast?.show(
                formatErrorMessage(t, error, 'errors.unknown-error'),
                3000,
            )
            onRejectRef.current(error as Error)
        }
        setIsLoading(false)
    }, [invoice, onAcceptRef, onRejectRef, payInvoice, t, toast])

    const handleReject = useCallback(() => {
        onRejectRef.current(
            new RejectionError(t('errors.webln-payment-rejected')),
        )
    }, [onRejectRef, t])

    // TODO: Dynamic amount input for lnurl payment
    const amountSats = invoice
        ? amountUtils.msatToSat(invoice.amount)
        : (0 as Sats)
    const isShowing = Boolean(invoice || lnurlPayment)

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
                message: `${amountUtils.formatNumber(amountSats)} ${t(
                    'words.sats',
                ).toUpperCase()}`,
                description: convertSatsToFormattedFiat(amountSats),
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
