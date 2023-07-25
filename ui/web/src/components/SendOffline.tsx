import { dataToFrames } from 'qrloop'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'
import { MSats, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector, useToast } from '../hooks'
import { fedimint } from '../lib/bridge'
import { styled, theme } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Checkbox } from './Checkbox'
import { CopyInput } from './CopyInput'
import { QRCode } from './QRCode'
import { Text } from './Text'

interface Props {
    onEcashGenerated(): void
    onPaymentSent(): void
}

export const SendOffline: React.FC<Props> = ({
    onEcashGenerated,
    onPaymentSent,
}) => {
    const { t } = useTranslation()
    const { showErrorToast } = useToast()
    const activeFederation = useAppSelector(selectActiveFederation)
    const [amount, setAmount] = useState(0 as Sats)
    const [isGeneratingEcash, setIsGeneratingEcash] = useState(false)
    const [offlinePayment, setOfflinePayment] = useState<string | null>(null)
    const [qrFrames, setQrFrames] = useState<string[] | null>(null)
    const [hasConfirmedPayment, setHasConfirmedPayment] = useState(false)

    const federationId = activeFederation?.id
    const balance = activeFederation?.balance || (0 as MSats)
    const isDisabled = amount <= 0 || amount > amountUtils.msatToSat(balance)

    const handleSend = useCallback(async () => {
        if (!federationId) return
        setIsGeneratingEcash(true)
        try {
            const ecash = await fedimint.generateEcash(
                amountUtils.satToMsat(amount),
                federationId,
            )
            onEcashGenerated()
            setOfflinePayment(ecash)
            setQrFrames(dataToFrames(ecash))
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
        setIsGeneratingEcash(false)
    }, [amount, federationId, showErrorToast, onEcashGenerated])

    if (offlinePayment && qrFrames) {
        return (
            <>
                <QRCode data={qrFrames} />
                <CopyInput
                    value={offlinePayment}
                    onCopyMessage={t('feature.send.copied-offline-payment')}
                />
                <Checkbox
                    label={t('feature.send.i-have-sent-payment')}
                    checked={hasConfirmedPayment}
                    onChange={setHasConfirmedPayment}
                />
                <Button disabled={!hasConfirmedPayment} onClick={onPaymentSent}>
                    {t('words.done')}
                </Button>
            </>
        )
    } else {
        return (
            <>
                <AmountContainer>
                    <AmountInput
                        amount={amount}
                        onChangeAmount={setAmount}
                        readOnly={isGeneratingEcash}
                    />
                </AmountContainer>

                <HelpText>
                    <Text variant="small">
                        {t('feature.send.offline-send-warning')}
                    </Text>
                </HelpText>
                <Button
                    disabled={isDisabled}
                    loading={isGeneratingEcash}
                    onClick={handleSend}>
                    {t('words.send')}
                </Button>
            </>
        )
    }
}

const AmountContainer = styled('div', {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '32px 0',
})

const HelpText = styled('div', {
    maxWidth: 280,
    margin: 'auto',
    textAlign: 'center',
    color: theme.colors.grey,
})
