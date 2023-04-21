import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import SwitchLeftIcon from '@fedi/common/assets/svgs/switch-left.svg'
import SwitchRightIcon from '@fedi/common/assets/svgs/switch-right.svg'
import { selectActiveFederation } from '@fedi/common/redux'
import { Sats } from '@fedi/common/types'
import AmountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Icon } from './Icon'
import { QRCode } from './QRCode'
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
    const [isGeneratingQr, setIsGeneratingQr] = useState(false)
    const [lightningInvoice, setLightningInvoice] = useState<string>()
    const [bitcoinUrl, setBitcoinUrl] = useState<string>()
    const [generateError, setGenerateError] = useState<string>()
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Reset on close, focus input on open
    useEffect(() => {
        if (!open) {
            setAmount(0 as Sats)
            setNote('')
            setIsRequesting(false)
            setIsGeneratingQr(false)
            setLightningInvoice(undefined)
            setBitcoinUrl(undefined)
            setGenerateError(undefined)
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
                    AmountUtils.satToMsat(amount),
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

    const handleCopy = useCallback(() => {
        const data = isLightning ? `lightning:${lightningInvoice}` : bitcoinUrl
        if (!data) return
        navigator.clipboard.writeText(data)
    }, [isLightning, lightningInvoice, bitcoinUrl])

    const qrData = isLightning ? lightningInvoice?.toUpperCase() : bitcoinUrl

    const error =
        amount > 200_000 ? `Maximum amount is 200,000 sats` : generateError

    const showNote = !isRequesting || !!note

    return (
        <Dialog
            title={t('feature.receive.request-bitcoin')}
            open={open}
            onOpenChange={onOpenChange}>
            <Container ref={containerRef}>
                <RequestTypeToggle onClick={() => setIsLightning(!isLightning)}>
                    <Text variant="caption" weight="medium">
                        {t(isLightning ? 'words.lightning' : 'words.onchain')}
                    </Text>
                    <Icon
                        size={20}
                        icon={isLightning ? SwitchLeftIcon : SwitchRightIcon}
                    />
                </RequestTypeToggle>
                <AmountInput
                    amount={amount}
                    error={error}
                    onChangeAmount={setAmount}
                    readOnly={isRequesting}
                />
                {showNote && (
                    <NoteInput
                        value={note}
                        placeholder={isRequesting ? '' : t('phrases.add-note')}
                        onChange={ev => setNote(ev.currentTarget.value)}
                        readOnly={isRequesting}
                    />
                )}
                {isRequesting && !qrData && (
                    <Loading>{t('words.pending')}</Loading>
                )}
                {typeof qrData === 'string' ? (
                    <>
                        <QRCode data={qrData} />
                        <Button width="full" onClick={handleCopy}>
                            {t('words.copy')}
                        </Button>
                    </>
                ) : (
                    <Button
                        width="full"
                        onClick={() => setIsRequesting(true)}
                        loading={isGeneratingQr}>
                        {t('words.request')} {AmountUtils.formatNumber(amount)}{' '}
                        {t('words.sats')}
                    </Button>
                )}
            </Container>
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
