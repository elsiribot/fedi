import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
    useBalanceDisplay,
    useMinMaxRequestAmount,
    useMinMaxSendAmount,
} from '@fedi/common/hooks/amount'
import { useToast } from '@fedi/common/hooks/toast'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import {
    selectActiveFederationId,
    sendMatrixPaymentPush,
    sendMatrixPaymentRequest,
    selectMatrixUser,
} from '@fedi/common/redux'
import { Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppDispatch, useAppSelector } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { ChatAvatar } from './ChatAvatar'
import { Dialog } from './Dialog'
import { Text } from './Text'

interface Props {
    roomId: string
    recipientId: string
    recipientName: string
    open: boolean
    onOpenChange(open: boolean): void
}

export const ChatPaymentDialog: React.FC<Props> = ({
    roomId,
    recipientId,
    open,
    onOpenChange,
}) => {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()
    const toast = useToast()
    const activeFederationId = useAppSelector(selectActiveFederationId)
    const sendMinMax = useMinMaxSendAmount()
    const requestMinMax = useMinMaxRequestAmount({ ecashRequest: {} })
    const [federationId] = useState(activeFederationId)
    const [amount, setAmount] = useState(0 as Sats)
    const [submitAction, setSubmitAction] = useState<null | 'send' | 'request'>(
        null,
    )
    const [submitAttempts, setSubmitAttempts] = useState(0)
    const [submitType, setSubmitType] = useState<'send' | 'request'>()
    const onOpenChangeRef = useUpdatingRef(onOpenChange)
    const balanceDisplay = useBalanceDisplay(t)
    const recipient = useAppSelector(s => selectMatrixUser(s, recipientId))

    useEffect(() => {
        if (open) return
        setAmount(0 as Sats)
        setSubmitAction(null)
        setSubmitAttempts(0)
        setSubmitType(undefined)
    }, [open])

    const handleSend = useCallback(async () => {
        if (!federationId) return
        setSubmitType('send')
        setSubmitAttempts(attempt => attempt + 1)
        if (
            amount < sendMinMax.minimumAmount ||
            amount > sendMinMax.maximumAmount
        ) {
            return
        }

        setSubmitAction('send')
        try {
            await dispatch(
                sendMatrixPaymentPush({
                    fedimint,
                    federationId,
                    roomId,
                    recipientId,
                    amount: amountUtils.satToMsat(amount),
                }),
            ).unwrap()
            onOpenChangeRef.current(false)
        } catch (err) {
            toast.error(t, err, 'errors.unknown-error')
        }
        setSubmitAction(null)
    }, [
        federationId,
        amount,
        sendMinMax.minimumAmount,
        sendMinMax.maximumAmount,
        dispatch,
        roomId,
        recipientId,
        onOpenChangeRef,
        toast,
        t,
    ])

    const handleRequest = useCallback(async () => {
        if (!federationId) return
        setSubmitType('request')
        setSubmitAttempts(attempt => attempt + 1)
        if (
            amount < requestMinMax.minimumAmount ||
            amount > requestMinMax.maximumAmount
        ) {
            return
        }

        setSubmitAction('request')
        setSubmitType('request')
        try {
            await dispatch(
                sendMatrixPaymentRequest({
                    fedimint,
                    federationId,
                    roomId,
                    amount: amountUtils.satToMsat(amount),
                }),
            ).unwrap()
            onOpenChangeRef.current(false)
        } catch (err) {
            toast.error(t, 'errors.unknown-error')
        }
        setSubmitAction(null)
    }, [
        federationId,
        amount,
        requestMinMax.minimumAmount,
        requestMinMax.maximumAmount,
        dispatch,
        roomId,
        onOpenChangeRef,
        toast,
        t,
    ])

    const inputMinMax =
        submitType === 'send'
            ? sendMinMax
            : submitType === 'request'
            ? requestMinMax
            : {}

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <MemberContainer>
                {recipient && (
                    <>
                        <ChatAvatar size="sm" user={recipient} />
                        <Text weight="medium">{recipient.displayName}</Text>
                    </>
                )}
            </MemberContainer>
            <Balance>{balanceDisplay}</Balance>
            <AmountContainer>
                {open && (
                    <AmountInput
                        amount={amount}
                        onChangeAmount={setAmount}
                        verb={
                            submitType === 'send'
                                ? t('words.send')
                                : t('words.request')
                        }
                        submitAttempts={submitAttempts}
                        {...inputMinMax}
                    />
                )}
            </AmountContainer>
            <Actions>
                <Button
                    loading={submitAction === 'request'}
                    disabled={submitAction === 'send'}
                    onClick={handleRequest}>
                    {t('words.request')}
                </Button>
                <Button
                    loading={submitAction === 'send'}
                    disabled={submitAction === 'request'}
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

const MemberContainer = styled('div', {
    display: 'flex',
    gap: theme.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.xl,
})

const AmountContainer = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: `60px 0`,

    '@sm': {
        padding: '32px 0',
    },
})

const Actions = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,

    '> *': {
        flex: 1,
    },
})
