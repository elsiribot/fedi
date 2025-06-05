import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button } from '@rneui/themed'
import { ResultAsync } from 'neverthrow'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRequestForm } from '@fedi/common/hooks/amount'
import { useToast } from '@fedi/common/hooks/toast'
import { selectActiveFederationId } from '@fedi/common/redux'
import { RpcTransaction, TransactionEvent } from '@fedi/common/types/bindings'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { tryTag } from '@fedi/common/utils/errors'
import { lnurlWithdraw } from '@fedi/common/utils/lnurl'

import { fedimint } from '../bridge'
import { AmountScreen } from '../components/ui/AmountScreen'
import Flex from '../components/ui/Flex'
import { SafeScrollArea } from '../components/ui/SafeArea'
import { useAppSelector } from '../state/hooks'
import { reset } from '../state/navigation'
import { Sats } from '../types'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RedeemLnurlWithdraw'
>

const RedeemLnurlWithdraw: React.FC<Props> = ({ navigation, route }: Props) => {
    const lnurlWithdrawal = route.params.parsedData.data
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederationId)
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
    const toast = useToast()
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [notes, setNotes] = useState<string>('')

    const onChangeAmount = (updatedValue: Sats) => {
        setSubmitAttempts(0)
        setAmount(updatedValue)
    }

    // Wait for the LNURL withdrawal invoice to be paid
    // Times out after 5 seconds
    const awaitLnurlWithdrawTxn = (lnurlInvoice: string) => {
        return ResultAsync.fromPromise(
            new Promise<RpcTransaction>((resolve, reject) => {
                const unsubscribe = fedimint.addListener(
                    'transaction',
                    (event: TransactionEvent) => {
                        if (
                            event.transaction.kind === 'lnReceive' &&
                            event.transaction.ln_invoice === lnurlInvoice
                        ) {
                            unsubscribe()
                            resolve(event.transaction)
                        }
                    },
                )

                setTimeout(() => {
                    unsubscribe()
                    reject(new Error('feature.receive.lnurl-withdraw-failed'))
                }, 5000)
            }),
            tryTag('TimeoutError'),
        )
    }

    const handleSubmit = async () => {
        setSubmitAttempts(attempts => attempts + 1)
        if (
            amount > maximumAmount ||
            amount < minimumAmount ||
            !activeFederationId
        ) {
            return
        }

        setIsLoading(true)

        // Attempt to LNURL withdraw
        await ResultAsync.fromPromise(
            lnurlWithdraw(
                fedimint,
                activeFederationId,
                lnurlWithdrawal,
                amountUtils.satToMsat(amount),
                memo,
            ),
            // TODO: be more specific about errors when lnurl utils are refactored
            tryTag('GenericError'),
        )
            .andThen(awaitLnurlWithdrawTxn)
            .match(
                tx => {
                    navigation.dispatch(
                        reset('ReceiveSuccess', {
                            tx,
                        }),
                    )
                },
                e => toast.error(t, e),
            )
        setIsLoading(false)
    }

    return (
        <SafeScrollArea edges="notop">
            <AmountScreen
                amount={amount}
                onChangeAmount={onChangeAmount}
                minimumAmount={minimumAmount}
                maximumAmount={maximumAmount}
                submitAttempts={submitAttempts}
                isSubmitting={isLoading}
                readOnly={Boolean(exactAmount)}
                verb={t('words.redeem')}
                notes={notes}
                setNotes={setNotes}
                isIndependent
            />
            <Flex gap="md">
                <Button
                    title={`${t('words.redeem')}${
                        amount ? ` ${amountUtils.formatSats(amount)} ` : ' '
                    }${t('words.sats').toUpperCase()}`}
                    onPress={handleSubmit}
                    disabled={isLoading}
                    loading={isLoading}
                />
            </Flex>
        </SafeScrollArea>
    )
}

export default RedeemLnurlWithdraw
