import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { selectActiveFederation } from '@fedi/common/redux'
import { Sats } from '@fedi/common/types'
import AmountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { styled } from '../styles'
import { AmountInput } from './AmountInput'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface Props {
    open: boolean
    onOpenChange(open: boolean): void
}

export const SendPaymentDialog: React.FC<Props> = ({ open, onOpenChange }) => {
    const { t } = useTranslation()
    const balance = useAppSelector(selectActiveFederation)?.balance
    const [amount, setAmount] = useState(0 as Sats)

    useEffect(() => {
        if (!open) setAmount(0 as Sats)
    }, [open])

    if (typeof balance !== 'number') return null

    return (
        <Dialog
            title={t('feature.send.send-bitcoin')}
            description={`${t('words.balance')}: ${AmountUtils.formatNumber(
                AmountUtils.msatToSat(balance),
            )} ${t('words.sats')}`}
            open={open}
            onOpenChange={onOpenChange}>
            <Container>
                <AmountInput
                    amount={amount}
                    max={AmountUtils.msatToSat(balance)}
                    onChangeAmount={setAmount}
                />
                <Button width="full">
                    Send {AmountUtils.formatNumber(amount)} {t('words.sats')}
                </Button>
            </Container>
        </Dialog>
    )
}

const Container = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
})
