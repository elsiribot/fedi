import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    selectActiveFederation,
    sendDirectMessage,
    selectAuthenticatedMember,
} from '@fedi/common/redux'
import { ChatPaymentStatus, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppDispatch, useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface Props {
    recipientId: string
    open: boolean
    onOpenChange(open: boolean): void
}

export const ChatPaymentDialog: React.FC<Props> = ({
    open,
    recipientId,
    onOpenChange,
}) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const activeFederation = useAppSelector(selectActiveFederation)
    const myId = useAppSelector(selectAuthenticatedMember)?.id
    const [amount, setAmount] = useState(0 as Sats)
    const [isSending, setIsSending] = useState(false)
    const onOpenChangeRef = useUpdatingRef(onOpenChange)

    const balance = activeFederation?.balance
    const federationId = activeFederation?.id

    useEffect(() => {
        if (open) return
        setAmount(0 as Sats)
        setIsSending(false)
    }, [open])

    const sendPaymentMessage = useCallback(
        async (token?: string) => {
            if (!federationId || !myId) return
            try {
                await dispatch(
                    sendDirectMessage({
                        fedimint,
                        federationId,
                        recipientId,
                        payment: {
                            status: token
                                ? ChatPaymentStatus.accepted
                                : ChatPaymentStatus.requested,
                            amount: amountUtils.satToMsat(amount),
                            recipient: token ? recipientId : myId,
                            token,
                        },
                    }),
                ).unwrap()
                onOpenChangeRef.current(false)
            } catch (err) {
                toast.showErrorToast(err, 'errors.chat-unavailable')
            }
        },
        [
            dispatch,
            federationId,
            recipientId,
            myId,
            amount,
            toast,
            onOpenChangeRef,
        ],
    )

    const handleSend = useCallback(async () => {
        if (!federationId) return
        setIsSending(true)
        try {
            const token = await fedimint.generateEcash(
                amountUtils.satToMsat(amount),
                federationId,
            )
            await sendPaymentMessage(token)
        } catch (err) {
            toast.showErrorToast(err, 'errors.unknown-error')
        }
        setIsSending(false)
    }, [sendPaymentMessage, amount, toast, federationId])

    const handleRequest = useCallback(async () => {
        setIsSending(true)
        await sendPaymentMessage()
        setIsSending(false)
    }, [sendPaymentMessage])

    if (balance === undefined) return null

    const isReceiveDisabled = amount <= 0
    const isSendDisabled = amount <= 0 || amount > balance

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <Balance>
                {t('words.balance')}:{' '}
                {amountUtils.formatNumber(amountUtils.msatToSat(balance))}{' '}
                {t('words.sats')}
            </Balance>
            <AmountContainer>
                {open && (
                    <AmountInput amount={amount} onChangeAmount={setAmount} />
                )}
            </AmountContainer>
            <Actions>
                <Button
                    disabled={isReceiveDisabled}
                    loading={isSending}
                    onClick={handleRequest}>
                    {t('words.request')}
                </Button>
                <Button
                    disabled={isSendDisabled}
                    loading={isSending}
                    onClick={handleSend}>
                    {t('words.send')}
                </Button>
            </Actions>
        </Dialog>
    )
}

const Balance = styled('div', {
    fontSize: theme.fontSizes.caption,
    textAlign: 'center',
    color: theme.colors.darkGrey,
})

const AmountContainer = styled('div', {
    padding: `60px 0`,
})

const Actions = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,

    '> *': {
        flex: 1,
        maxWidth: 160,
    },
})
