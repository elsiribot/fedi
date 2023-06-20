import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useIsOfflineWalletSupported } from '@fedi/common/hooks/federation'
import { selectActiveFederation } from '@fedi/common/redux'
import { Invoice } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { DialogStatus, DialogStatusProps } from './DialogStatus'
import { Input } from './Input'
import { QRScanner } from './QRScanner'
import { ScanResult } from './QRScanner'
import { SendOffline } from './SendOffline'
import { Text } from './Text'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const SendPaymentDialog: React.FC<Props> = ({ open, onOpenChange }) => {
    const { t } = useTranslation()
    const balance = useAppSelector(selectActiveFederation)?.balance
    const activeFederationId = useAppSelector(selectActiveFederation)?.id
    const toast = useToast()
    const [invoiceValue, setInvoiceValue] = useState('')
    const [invoice, setInvoice] = useState<Invoice>()
    const [wantsDecoding, setWantsDecoding] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [isSendingOffline, setIsSendingOffline] = useState(false)
    const [isCloseDisabled, setIsCloseDisabled] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [hasSent, setHasSent] = useState(false)
    const [sendError, setSendError] = useState<string>()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const isOfflineWalletSupported = useIsOfflineWalletSupported()

    useEffect(() => {
        if (!open) {
            setInvoice(undefined)
            setInvoiceValue('')
            setWantsDecoding(false)
            setIsScanning(false)
            setIsSendingOffline(false)
            setIsCloseDisabled(false)
            setIsSending(false)
            setHasSent(false)
            setSendError(undefined)
        } else {
            requestAnimationFrame(() =>
                containerRef.current?.querySelector('input')?.focus(),
            )
        }
    }, [open])

    const decodeInvoice = useCallback(
        async (invoiceStr: string) => {
            try {
                const normalizedInvoice = invoiceStr.split(':').pop()?.trim()
                if (!normalizedInvoice) throw new Error('Invalid invoice')
                const decoded = await fedimint.decodeInvoice(normalizedInvoice)
                setInvoice(decoded)
            } catch (err) {
                toast.showErrorToast(err, 'errors.unknown-error')
                setWantsDecoding(false)
            }
        },
        [toast],
    )

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
        } catch (err) {
            setSendError(formatErrorMessage(t, err, 'errors.unknown-error'))
        }
        setIsSending(false)
    }, [invoice, activeFederationId, onOpenChange, t])

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
                    {invoice.description && (
                        <InvoiceDescription>
                            <Text variant="caption" weight="medium">
                                &quot;{invoice.description}&quot;
                            </Text>
                        </InvoiceDescription>
                    )}
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
                <Button onClick={() => setIsScanning(false)}>
                    {t('feature.send.paste-payment-request')}
                </Button>
            </>
        )
    } else if (isSendingOffline) {
        content = (
            <SendOffline
                onEcashGenerated={() => setIsCloseDisabled(true)}
                onPaymentSent={() => onOpenChange(false)}
            />
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
                <Button onClick={() => setIsScanning(true)}>
                    {t('feature.send.scan-qr-code')}
                </Button>
                {isOfflineWalletSupported && (
                    <Button onClick={() => setIsSendingOffline(true)}>
                        {t('feature.send.send-to-offline-user')}
                    </Button>
                )}
            </>
        )
    }

    return (
        <Dialog
            title={t('feature.send.send-bitcoin')}
            description={`${t('words.balance')}: ${amountUtils.formatNumber(
                amountUtils.msatToSat(balance),
            )} ${t('words.sats')}`}
            open={open}
            disableClose={isCloseDisabled}
            onOpenChange={onOpenChange}>
            <Container ref={containerRef}>
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

const InvoiceContainer = styled('div', {
    padding: '32px 0',
})

const InvoiceDescription = styled('div', {
    textAlign: 'center',
    marginBottom: 24,
})
