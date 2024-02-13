import { useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View } from 'react-native'
import { RejectionError } from 'webln'

import { useRequestForm } from '@fedi/common/hooks/amount'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectActiveFederationId } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { makeLog } from '@fedi/common/utils/log'
import { EcashRequest } from '@fedi/injections'

import { fedimint } from '../../../bridge'
import { useEnvironmentContext } from '../../../state/contexts/EnvironmentContext'
import { useAppSelector } from '../../../state/hooks'
import { FediMod, MSats } from '../../../types'
import AmountInput from '../../ui/AmountInput'
import CustomOverlay from '../../ui/CustomOverlay'

const log = makeLog('MakeInvoiceOverlay')

interface Props {
    fediMod: FediMod
    ecashRequest?: EcashRequest | null
    onReject: (err: Error) => void
    onAccept: (res: { ecash: string }) => void
}

export const GenerateEcashOverlay: React.FC<Props> = ({
    fediMod,
    ecashRequest,
    onReject,
    onAccept,
}) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { toast } = useEnvironmentContext().state
    const federationId = useAppSelector(selectActiveFederationId)
    const onRejectRef = useUpdatingRef(onReject)
    const onAcceptRef = useUpdatingRef(onAccept)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [amountInputKey, setAmountInputKey] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const {
        inputAmount,
        setInputAmount,
        minimumAmount,
        maximumAmount,
        exactAmount,
        reset,
    } = useRequestForm({ ecashRequest })

    // Reset form when it appears
    const isShowing = Boolean(ecashRequest)
    useEffect(() => {
        if (isShowing) {
            reset()
            setSubmitAttempts(0)
            setAmountInputKey(key => key + 1)
            setIsLoading(false)
        }
    }, [isShowing, reset])

    const handleAccept = async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (inputAmount > maximumAmount || inputAmount < minimumAmount) {
            return
        }

        try {
            setIsLoading(true)
            if (!federationId) throw new Error()
            const msats = amountUtils.satToMsat(inputAmount)

            const res = await fedimint.generateEcash(
                msats as MSats,
                federationId,
            )

            onAcceptRef.current({ ecash: res.ecash })
        } catch (error) {
            log.error('Failed to generate ecash', error, ecashRequest)
            toast?.show(
                formatErrorMessage(t, error, 'errors.unknown-error'),
                3000,
            )
            onRejectRef.current(error as Error)
        }
    }

    const handleReject = () => {
        onRejectRef.current(
            new RejectionError(t('errors.webln-payment-request-rejected')),
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
                title: t('feature.fedimods.wants-you-to-pay', {
                    fediMod: fediMod.title,
                }),
                body: (
                    <View style={{ flex: 1, paddingTop: theme.spacing.xl }}>
                        <AmountInput
                            key={amountInputKey}
                            amount={inputAmount}
                            isSubmitting={isLoading}
                            submitAttempts={submitAttempts}
                            minimumAmount={minimumAmount}
                            maximumAmount={maximumAmount}
                            readOnly={!!exactAmount}
                            verb={t('words.request')}
                            onChangeAmount={amount => {
                                setSubmitAttempts(0)
                                setInputAmount(amount)
                            }}
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
