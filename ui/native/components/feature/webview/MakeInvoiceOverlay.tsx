import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RejectionError, RequestInvoiceArgs } from 'webln'

import { useRequestForm } from '@fedi/common/hooks/amount'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useBridge, useBtcFiatPrice } from '../../../state/hooks'
import { FediMod, ParsedLnurlWithdraw } from '../../../types'
import AmountInput from '../../ui/AmountInput'
import CustomOverlay from '../../ui/CustomOverlay'

interface Props {
    fediMod: FediMod
    requestInvoiceArgs?: RequestInvoiceArgs | null
    lnurlWithdrawal?: ParsedLnurlWithdraw['data'] | null
    onReject: (err: Error) => void
    onAccept: (invoice: string) => void
}

export const MakeInvoiceOverlay: React.FC<Props> = ({
    fediMod,
    requestInvoiceArgs,
    lnurlWithdrawal,
    onReject,
    onAccept,
}) => {
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state
    const { generateInvoice } = useBridge()
    const { convertSatsToFormattedFiat } = useBtcFiatPrice()
    const onRejectRef = useUpdatingRef(onReject)
    const onAcceptRef = useUpdatingRef(onAccept)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const {
        inputAmount,
        setInputAmount,
        memo,
        minimumAmount,
        maximumAmount,
        exactAmount,
    } = useRequestForm({ requestInvoiceArgs, lnurlWithdrawal })

    const handleAccept = useCallback(async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) {
            return
        }

        try {
            setIsLoading(true)
            const invoice = await generateInvoice(
                amountUtils.satToMsat(inputAmount),
                memo,
            )
            onAcceptRef.current(invoice)
        } catch (error) {
            toast?.show(
                formatErrorMessage(t, error, 'errors.unknown-error'),
                3000,
            )
            onRejectRef.current(error as Error)
        }
    }, [
        inputAmount,
        memo,
        generateInvoice,
        maximumAmount,
        minimumAmount,
        onAcceptRef,
        onRejectRef,
        t,
        toast,
    ])

    const handleReject = useCallback(() => {
        onRejectRef.current(
            new RejectionError(t('errors.webln-payment-request-rejected')),
        )
    }, [onRejectRef, t])

    let title = ''
    let message = ''
    let description = ''
    let body: React.ReactNode = null
    if (exactAmount) {
        title = `${t('feature.fedimods.wants-to-pay-you', {
            fediMod: fediMod.title,
        })}`
        message = `${amountUtils.formatNumber(exactAmount)} ${t(
            'words.sats',
        ).toUpperCase()}`
        description = `${convertSatsToFormattedFiat(exactAmount)}`
    } else {
        title = `${t('feature.fedimods.enter-amount-to-withdraw', {
            fediMod: fediMod.title,
        })}`
        description = requestInvoiceArgs?.defaultMemo || ''
        body = (
            <AmountInput
                amount={inputAmount}
                submitAttempts={submitAttempts}
                minimumAmount={minimumAmount}
                maximumAmount={maximumAmount}
                verb={t('words.request')}
                onChangeAmount={amount => {
                    setSubmitAttempts(0)
                    setInputAmount(amount)
                }}
            />
        )
    }

    const isShowing = Boolean(lnurlWithdrawal || requestInvoiceArgs)

    return (
        <CustomOverlay
            show={isShowing}
            loading={isLoading}
            onBackdropPress={() =>
                onReject(new RejectionError('errors.webln-canceled'))
            }
            contents={{
                title,
                description,
                message,
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
