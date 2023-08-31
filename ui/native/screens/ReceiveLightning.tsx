import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard } from 'react-native'

import { useRequestForm } from '@fedi/common/hooks/amount'
import { selectActiveFederation } from '@fedi/common/redux'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'
import { lnurlWithdraw } from '@fedi/common/utils/lnurl'

import { fedimint } from '../bridge'
import { AmountScreen } from '../components/ui/AmountScreen'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useAppSelector, useBridge } from '../state/hooks'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ReceiveLightning'
>

const ReceiveLightning: React.FC<Props> = ({ navigation, route }: Props) => {
    const lnurlWithdrawal = route.params?.parsedData?.data
    const { t } = useTranslation()
    const { generateInvoice } = useBridge()
    const {
        inputAmount: amount,
        setInputAmount: setAmount,
        exactAmount,
        memo,
        minimumAmount,
        maximumAmount,
    } = useRequestForm({
        lnurlWithdrawal,
    })
    const { toast } = useEnvironmentContext().state
    const activeFederationId = useAppSelector(selectActiveFederation)?.id
    const [invoice, setInvoice] = useState<string>('')
    const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false)
    const [submitAttempts, setSubmitAttempts] = useState(0)

    useEffect(() => {
        const createNewInvoice = async () => {
            try {
                const newInvoice = await generateInvoice(
                    amountUtils.satToMsat(amount),
                    memo,
                )
                setInvoice(newInvoice)
            } catch (error) {
                toast?.show(t('errors.failed-to-generate-invoice'), 3000)
            }
        }
        if (generatingInvoice) {
            createNewInvoice()
        }
    }, [t, toast, amount, generateInvoice, generatingInvoice, memo])

    useEffect(() => {
        if (invoice) {
            setGeneratingInvoice(false)
            navigation.navigate('BitcoinRequest', {
                uri: `lightning:${invoice}`,
            })
        }
    }, [invoice, navigation])

    const onChangeAmount = (updatedValue: Sats) => {
        setSubmitAttempts(0)
        setAmount(updatedValue)
    }

    const handleLnurlWithdraw = async () => {
        setGeneratingInvoice(true)
        try {
            if (!activeFederationId || !lnurlWithdrawal) throw new Error()
            const lnurlInvoice = await lnurlWithdraw(
                fedimint,
                activeFederationId,
                lnurlWithdrawal,
                amountUtils.satToMsat(amount),
                memo,
            )
            navigation.navigate('BitcoinRequest', {
                uri: `lightning:${lnurlInvoice}`,
            })
            // TODO: Better UI for this? We want to show them the QR code in case
            // the payment doesn't go through, but we also want to let them know
            // that LNURL _should_ handle the payment.
            toast?.show(
                t('feature.receive.awaiting-withdrawal-from', {
                    domain: lnurlWithdrawal.domain,
                }),
            )
        } catch (err) {
            toast?.show(formatErrorMessage(t, err, 'error.unknown-error'))
            setGeneratingInvoice(false)
        }
    }

    const handleSubmit = () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (amount > maximumAmount || amount < minimumAmount) {
            return
        }

        if (lnurlWithdrawal) {
            handleLnurlWithdraw()
        } else {
            setGeneratingInvoice(true)
            Keyboard.dismiss()
        }
    }

    return (
        <AmountScreen
            amount={amount}
            onChangeAmount={onChangeAmount}
            minimumAmount={minimumAmount}
            maximumAmount={maximumAmount}
            submitAttempts={submitAttempts}
            readOnly={Boolean(exactAmount)}
            verb={t('words.request')}
            buttons={[
                {
                    title: `${t('words.request')}${
                        amount ? ` ${amountUtils.formatSats(amount)} ` : ' '
                    }${t('words.sats').toUpperCase()}`,
                    onPress: handleSubmit,
                    disabled: generatingInvoice,
                    loading: generatingInvoice,
                },
            ]}
        />
    )
}

export default ReceiveLightning
