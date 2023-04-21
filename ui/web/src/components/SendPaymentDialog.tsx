import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
    selectActiveFederation,
    setActiveFederationId,
} from '@fedi/common/redux'
import { Invoice, Sats } from '@fedi/common/types'
import AmountUtils from '@fedi/common/utils/AmountUtils'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { DialogStatus, DialogStatusProps } from './DialogStatus'
import { Input } from './Input'
import { QRScanner } from './QRScanner'
import { ScanResult } from './QRScanner'
import { Text } from './Text'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const SendPaymentDialog: React.FC<Props> = ({ open, onOpenChange }) => {
    const { t } = useTranslation()
    const balance = useAppSelector(selectActiveFederation)?.balance
    const activeFederationId = useAppSelector(selectActiveFederation)?.id
    const [invoice, setInvoice] = useState<Invoice>()
    const [invoiceValue, setInvoiceValue] = useState('')
    const [wantsDecoding, setWantsDecoding] = useState(false)
    const [decodeError, setDecodeError] = useState<string>()
    const [isScanning, setIsScanning] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [hasSent, setHasSent] = useState(false)
    const [sendError, setSendError] = useState<string>()

    useEffect(() => {
        if (!open) {
            setInvoice(undefined)
            setInvoiceValue('')
            setWantsDecoding(false)
            setDecodeError(undefined)
            setIsScanning(false)
            setIsSending(false)
            setHasSent(false)
            setSendError(undefined)
        }
    }, [open])

    const decodeInvoice = useCallback(async (invoiceStr: string) => {
        try {
            const decoded = await fedimint.decodeInvoice(invoiceStr)
            setInvoice(decoded)
        } catch (err: any) {
            setDecodeError(err.message || err.toString())
            setWantsDecoding(false)
        }
    }, [])

    // Decode invoice after half second of not typing
    useEffect(() => {
        if (!invoiceValue || !wantsDecoding) return
        const timeout = setTimeout(() => {
            decodeInvoice(invoiceValue)
        }, 500)
        return () => clearTimeout(timeout)
    }, [invoiceValue, wantsDecoding, decodeInvoice])

    const handleChangeInvoice = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            const value = ev.currentTarget.value.trim()
            setInvoiceValue(value)
            setWantsDecoding(!!value)
            setDecodeError(undefined)
        },
        [],
    )

    const handleScan = useCallback(
        async (result: ScanResult) => {
            decodeInvoice(result.data)
        },
        [decodeInvoice],
    )

    const handleSend = useCallback(async () => {
        if (!invoice || !activeFederationId) return
        setIsSending(true)
        try {
            await fedimint.payInvoice(invoice.invoice, activeFederationId)
            setHasSent(true)
            setTimeout(() => onOpenChange(false), 2500)
        } catch (err: any) {
            setSendError(err.message || err.toString())
        }
        setIsSending(false)
    }, [invoice, activeFederationId, onOpenChange])

    if (typeof balance !== 'number') return null

    let content: React.ReactNode
    let dialogStatusProps: DialogStatusProps | undefined
    if (invoice) {
        const sats = amountUtils.msatToSat(invoice.amount)
        const satsFmt = amountUtils.formatSats(sats)
        content = (
            <>
                <InvoiceContainer>
                    <AmountInput amount={sats} readOnly />
                    <InvoiceDescription>
                        <Text variant="caption" weight="medium">
                            &quot;{invoice.description}&quot;
                        </Text>
                    </InvoiceDescription>
                </InvoiceContainer>
                <Button onClick={handleSend}>
                    {t('words.send')} {satsFmt} {t('words.sats')}
                </Button>
            </>
        )

        if (hasSent) {
            dialogStatusProps = {
                status: 'success',
                title: `${t('feature.send.you-sent')} ${satsFmt} ${t(
                    'words.sats',
                )}`,
            }
        } else if (sendError) {
            dialogStatusProps = {
                status: 'error',
                title: 'Failed to send!', // TODO: Translate
                description: sendError,
            }
        } else if (isSending) {
            dialogStatusProps = {
                status: 'loading',
                description: `${t(
                    'feature.send.you-are-sending',
                )} ${satsFmt} ${t('words.sats')}...`,
            }
        }
    } else if (isScanning) {
        content = (
            <>
                <QRScanner onScan={handleScan} />
                {decodeError && <DecodeError>{decodeError}</DecodeError>}
                <Button onClick={() => setIsScanning(false)}>
                    {t('feature.send.paste-payment-request')}
                </Button>
            </>
        )
    } else {
        content = (
            <>
                <Input
                    label={t('feature.send.paste-payment-request')}
                    value={invoiceValue}
                    placeholder="lnbc..."
                    onChange={handleChangeInvoice}
                    disabled={isScanning || wantsDecoding}
                />
                {decodeError && <DecodeError>{decodeError}</DecodeError>}
                <Button onClick={() => setIsScanning(true)}>
                    {t('feature.send.scan-qr-code')}
                </Button>
            </>
        )
    }

    return (
        <Dialog
            title={t('feature.send.send-bitcoin')}
            description={`${t('words.balance')}: ${AmountUtils.formatNumber(
                AmountUtils.msatToSat(balance),
            )} ${t('words.sats')}`}
            open={open}
            onOpenChange={onOpenChange}>
            <Container>
                {content}
                {dialogStatusProps && <DialogStatus {...dialogStatusProps} />}
            </Container>
        </Dialog>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const DecodeError = styled('div', {
    textAlign: 'center',
    color: theme.colors.red,
})

const InvoiceContainer = styled('div', {
    padding: '32px 0',
})

const InvoiceDescription = styled('div', {
    textAlign: 'center',
    marginBottom: 24,
})
