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
            setQrFrames(dataToFrames(ecash))
        } catch (err) {
            showErrorToast(err, 'errors.unknown-error')
        }
        setIsGeneratingEcash(false)
    }, [amount, federationId, showErrorToast, onEcashGenerated])

    if (qrFrames) {
        return (
            <>
                <QRCode data={qrFrames} />
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
    padding: '30px 0',
})

const HelpText = styled('div', {
    maxWidth: 280,
    margin: 'auto',
    textAlign: 'center',
    color: theme.colors.grey,
})
