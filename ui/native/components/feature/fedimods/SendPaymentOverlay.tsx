import { useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { RejectionError } from 'webln'

import { useSendForm } from '@fedi/common/hooks/amount'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    payInvoice,
    selectPaymentFederation,
    selectWalletFederations,
    setPayFromFederationId,
} from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { lnurlPay } from '@fedi/common/utils/lnurl'
import { makeLog } from '@fedi/common/utils/log'

import { formatErrorMessage } from '@fedi/common/utils/format'
import { fedimint } from '../../../bridge'
import { useAppDispatch, useAppSelector } from '../../../state/hooks'
import {
    FediMod,
    Invoice,
    MSats,
    Network,
    ParsedLnurlPay,
} from '../../../types'
import AmountInput from '../../ui/AmountInput'
import CustomOverlay from '../../ui/CustomOverlay'
import FederationWalletSelector from '../send/FederationWalletSelector'

const log = makeLog('SendPaymentOverlay')

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
    const { theme } = useTheme()
    const paymentFederation = useAppSelector(selectPaymentFederation)
    const walletFederations = useAppSelector(selectWalletFederations)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [amountInputKey, setAmountInputKey] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const onRejectRef = useUpdatingRef(onReject)
    const onAcceptRef = useUpdatingRef(onAccept)
    const dispatch = useAppDispatch()
    const {
        inputAmount,
        setInputAmount,
        exactAmount,
        minimumAmount,
        maximumAmount,
        reset,
    } = useSendForm({
        invoice,
        lnurlPayment,
        t,
        selectedPaymentFederation: true,
    })

    // Reset form when it appears, requires a key bump to flush state.
    const isShowing = Boolean(invoice || lnurlPayment)

    useEffect(() => {
        if (isShowing) {
            // If no payment federation is set (e.g. your active federation is a non-wallet community), find a wallet federation to use
            if (!paymentFederation) {
                const firstWalletFederation = walletFederations
                    // Sort by balance
                    .sort((a, b) => b.balance - a.balance)
                    // Prioritize mainnet federations
                    .sort(
                        (a, b) =>
                            // Resolves to either 0 or 1 for true/false
                            // Sorts in descending order by network === bitcoin - network !== bitcoin
                            Number(b.network === Network.bitcoin) -
                            Number(a.network === Network.bitcoin),
                    )[0]

                dispatch(
                    setPayFromFederationId(firstWalletFederation?.id ?? null),
                )
            }

            reset()
            setAmountInputKey(key => key + 1)
            setError(null)
        }
    }, [isShowing, reset, paymentFederation, walletFederations, dispatch])

    const handleAccept = async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) {
            return
        }

        setIsLoading(true)
        try {
            if (!paymentFederation) throw new Error()
            if (invoice) {
                if (paymentFederation.balance < invoice.amount) {
                    throw new Error(
                        t('errors.insufficient-balance', {
                            balance: `${amountUtils.msatToSat(
                                paymentFederation.balance as MSats,
                            )} SATS`,
                        }),
                    )
                }

                const res = await dispatch(
                    payInvoice({
                        fedimint,
                        federationId: paymentFederation.id,
                        invoice: invoice.invoice,
                    }),
                ).unwrap()
                onAcceptRef.current(res)
            } else if (lnurlPayment) {
                const res = await lnurlPay(
                    fedimint,
                    paymentFederation.id,
                    lnurlPayment,
                    amountUtils.satToMsat(inputAmount),
                )
                onAcceptRef.current(res)
            }
        } catch (err) {
            log.error('Failed to pay invoice', invoice, err)

            setError(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
        setIsLoading(false)
    }

    const handleReject = () => {
        onRejectRef.current(
            new RejectionError(t('errors.webln-payment-rejected')),
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
                body: (
                    <View
                        style={{
                            flex: 1,
                            paddingTop: theme.spacing.xl,
                            alignItems: 'center',
                            gap: theme.spacing.lg,
                        }}>
                        <FederationWalletSelector />
                        <AmountInput
                            key={amountInputKey}
                            amount={inputAmount}
                            isSubmitting={isLoading}
                            submitAttempts={submitAttempts}
                            minimumAmount={minimumAmount}
                            maximumAmount={maximumAmount}
                            readOnly={!!exactAmount}
                            verb={t('words.send')}
                            onChangeAmount={amount => {
                                setSubmitAttempts(0)
                                setInputAmount(amount)
                            }}
                            error={error}
                        />
                    </View>
                ),
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
