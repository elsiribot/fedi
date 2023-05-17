import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SwitchLeftIcon from '@fedi/common/assets/svgs/switch-left.svg'
import SwitchRightIcon from '@fedi/common/assets/svgs/switch-right.svg'
import {
    useIsOfflineWalletSupported,
    useIsOnchainDepositSupported,
} from '@fedi/common/hooks/federation'
import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectActiveFederation } from '@fedi/common/redux'
import { Sats, Transaction } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { CopyInput } from './CopyInput'
import { Dialog } from './Dialog'
import { DialogStatus } from './DialogStatus'
import { Icon } from './Icon'
import { QRCode } from './QRCode'
import { ReceiveOffline } from './ReceiveOffline'
import { Text } from './Text'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const RequestPaymentDialog: React.FC<Props> = ({
    open,
    onOpenChange,
}) => {
    const { t } = useTranslation()
    const activeFederationId = useAppSelector(selectActiveFederation)?.id
    const [amount, setAmount] = useState(0 as Sats)
    const [note, setNote] = useState('')
    const [isRequesting, setIsRequesting] = useState(false)
    const [isLightning, setIsLightning] = useState(true)
    const [lightningInvoice, setLightningInvoice] = useState<string>()
    const [bitcoinUrl, setBitcoinUrl] = useState<string>()
    const [generateError, setGenerateError] = useState<string>()
    const [isReceivingOffline, setIsReceivingOffline] = useState(false)
    const [receivedTransaction, setReceivedTransaction] =
        useState<Transaction>()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const onOpenChangeRef = useUpdatingRef(onOpenChange)
    const isOfflineWalletSupported = useIsOfflineWalletSupported()
    const isOnchainSupported = useIsOnchainDepositSupported()

    // Reset on close, focus input on open
    useEffect(() => {
        if (!open) {
            setAmount(0 as Sats)
            setNote('')
            setIsRequesting(false)
            setLightningInvoice(undefined)
            setBitcoinUrl(undefined)
            setGenerateError(undefined)
            setIsReceivingOffline(false)
            setReceivedTransaction(undefined)
        } else {
            requestAnimationFrame(() =>
                containerRef.current?.querySelector('input')?.focus(),
            )
        }
    }, [open])

    // Reset invoices on federation change, amount change, or note change
    useEffect(() => {
        setLightningInvoice(undefined)
        setBitcoinUrl(undefined)
    }, [activeFederationId, amount, note])

    // Generate fresh invoice / address on any change to it
    useEffect(() => {
        if (!isRequesting || !activeFederationId) return

        let canceled = false
        let promise: Promise<any> | undefined

        if (isLightning && !lightningInvoice) {
            promise = fedimint
                .generateInvoice(
                    amountUtils.satToMsat(amount),
                    note,
                    activeFederationId,
                )
                .then(invoice => {
                    if (canceled) return
                    setLightningInvoice(invoice)
                })
        } else if (!isLightning && !bitcoinUrl) {
            promise = fedimint
                .generateAddress(activeFederationId)
                .then(addr => {
                    if (canceled) return
                    setBitcoinUrl(
                        `bitcoin:${addr}?amount=${amount}&message=${note}`,
                    )
                })
        }

        if (promise) {
            setGenerateError(undefined)
            promise.catch(err => {
                setGenerateError(err.message || err.toString())
                setIsRequesting(false)
            })
            return () => {
                canceled = true
            }
        }
    }, [
        isRequesting,
        amount,
        note,
        isLightning,
        lightningInvoice,
        bitcoinUrl,
        activeFederationId,
    ])

    // Watch for incoming payments when we're rendering a lightning invoice
    useEffect(() => {
        if (!lightningInvoice) return
        const unsubscribe = fedimint.addListener('transaction', event => {
            const { lightning, bitcoin } = event.transaction
            const wasLnPayment =
                lightningInvoice &&
                lightning &&
                lightning.invoice.toLowerCase() ===
                    lightningInvoice.toLowerCase()
            const wasBitcoinPayment =
                bitcoinUrl &&
                bitcoin &&
                bitcoinUrl
                    .toLowerCase()
                    .includes(bitcoin?.address.toLowerCase())
            if (wasLnPayment || wasBitcoinPayment) {
                setReceivedTransaction(event.transaction)
                setTimeout(() => {
                    onOpenChangeRef.current(false)
                }, 3000)
            }
        })
        return () => unsubscribe()
    }, [lightningInvoice, bitcoinUrl, onOpenChangeRef])

    const qrData = isLightning ? lightningInvoice?.toUpperCase() : bitcoinUrl
    const copyData = isLightning ? `lightning:${lightningInvoice}` : bitcoinUrl
    const error =
        amount > 200_000 ? `Maximum amount is 200,000 sats` : generateError
    const showNote = !!note || !isRequesting

    let content: React.ReactNode
    if (isReceivingOffline) {
        content = <ReceiveOffline onReceive={() => onOpenChange(false)} />
    } else {
        content = (
            <>
                {isOnchainSupported && (
                    <RequestTypeToggle
                        onClick={() => setIsLightning(!isLightning)}>
                        <Text variant="caption" weight="medium">
                            {t(
                                isLightning
                                    ? 'words.lightning'
                                    : 'words.onchain',
                            )}
                        </Text>
                        <Icon
                            size={20}
                            icon={
                                isLightning ? SwitchLeftIcon : SwitchRightIcon
                            }
                        />
                    </RequestTypeToggle>
                )}
                <AmountInput
                    amount={amount}
                    error={error}
                    onChangeAmount={setAmount}
                    readOnly={isRequesting}
                />
                {showNote && (
                    <NoteInput
                        value={note}
                        placeholder={qrData ? '' : t('phrases.add-note')}
                        onChange={ev => setNote(ev.currentTarget.value)}
                        readOnly={isRequesting}
                    />
                )}
                {isRequesting ? (
                    <QRContainer>
                        {qrData ? (
                            <QRCode data={qrData} />
                        ) : (
                            <Loading>{t('words.pending')}</Loading>
                        )}
                        <CopyInput
                            value={copyData || ''}
                            onCopyMessage={t(
                                'feature.receive.copied-payment-code',
                            )}
                        />
                    </QRContainer>
                ) : (
                    <Buttons>
                        <Button
                            width="full"
                            onClick={() => setIsRequesting(true)}
                            loading={isRequesting}>
                            {t('words.request')}{' '}
                            {amountUtils.formatNumber(amount)} {t('words.sats')}
                        </Button>
                        {isOfflineWalletSupported && (
                            <Button onClick={() => setIsReceivingOffline(true)}>
                                {t('feature.receive.receive-bitcoin-offline')}
                            </Button>
                        )}
                    </Buttons>
                )}
                {receivedTransaction && (
                    <DialogStatus
                        status="success"
                        title={`${t(
                            receivedTransaction.bitcoin
                                ? 'feature.receive.pending-transaction'
                                : 'feature.receive.you-received',
                        )}`}
                        description={`${amountUtils.formatSats(
                            amountUtils.msatToSat(receivedTransaction.amount),
                        )} ${t('words.sats')}`}
                    />
                )}
            </>
        )
    }

    return (
        <Dialog
            title={t('feature.receive.request-bitcoin')}
            open={open}
            onOpenChange={onOpenChange}>
            <Container ref={containerRef}>{content}</Container>
        </Dialog>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 24,
    gap: 24,
})

const RequestTypeToggle = styled('button', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: theme.colors.grey,
    outline: 'none',

    '&:hover, &:focus': {
        color: theme.colors.primary,
    },
})

const NoteInput = styled('input', {
    padding: 8,
    textAlign: 'center',
    fontSize: theme.fontSizes.caption,
    fontWeight: theme.fontWeights.medium,
    background: 'none',
    border: 'none',
    outline: 'none',

    '&[readonly]': {
        cursor: 'default',
    },
})

const Loading = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: '1 / 1',
    opacity: 0.25,
})

const QRContainer = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})

const Buttons = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
})
