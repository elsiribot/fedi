import Link from 'next/link'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

import BitcoinIcon from '@fedi/common/assets/svgs/bitcoin.svg'
import ListIcon from '@fedi/common/assets/svgs/list.svg'
import {
    selectActiveFederation,
    selectBtcExchangeRate,
    selectCurrency,
} from '@fedi/common/redux'
import AmountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { styled, theme } from '../styles'
import { Button } from './Button'
import { Icon } from './Icon'
import { RequestPaymentDialog } from './RequestPaymentDialog'
import { SendPaymentDialog } from './SendPaymentDialog'
import { Text } from './Text'

export const BitcoinWallet: React.FC = () => {
    const { t } = useTranslation()
    const balance = useAppSelector(selectActiveFederation)?.balance
    const btcToFiatRate = useAppSelector(selectBtcExchangeRate)
    const currency = useAppSelector(selectCurrency)
    const [isRequestingOpen, setIsRequestingOpen] = useState(false)
    const [isSendingOpen, setIsSendingOpen] = useState(false)

    const isBalanceLoading = typeof balance !== 'number'
    const isPriceLoading = isBalanceLoading || !btcToFiatRate

    return (
        <Container>
            <Header>
                <IconWrapper>
                    <Icon size="md" icon={BitcoinIcon} />
                </IconWrapper>
                <Name>
                    <Text weight="bold">{t('words.bitcoin')}</Text>
                </Name>
                <Link href="/transactions/bitcoin">
                    <Icon icon={ListIcon} />
                </Link>
            </Header>
            <Balance>
                {!isPriceLoading && (
                    <Text variant="h2" weight="normal">
                        {AmountUtils.formatFiat(
                            AmountUtils.msatToFiat(balance, btcToFiatRate),
                            currency,
                        )}
                    </Text>
                )}
                {!isBalanceLoading && (
                    <Text variant="caption" weight="medium">
                        {AmountUtils.formatNumber(
                            AmountUtils.msatToSat(balance),
                        )}{' '}
                        {t('words.sats')}
                    </Text>
                )}
            </Balance>
            <Buttons>
                <Button
                    variant="secondary"
                    width="full"
                    onClick={() => setIsRequestingOpen(true)}>
                    {t('words.request')}
                </Button>
                <Button
                    variant="secondary"
                    width="full"
                    onClick={() => setIsSendingOpen(true)}>
                    {t('words.send')}
                </Button>
            </Buttons>
            <RequestPaymentDialog
                open={isRequestingOpen}
                onOpenChange={setIsRequestingOpen}
            />
            <SendPaymentDialog
                open={isSendingOpen}
                onOpenChange={setIsSendingOpen}
            />
        </Container>
    )
}

const Container = styled('div', {
    padding: 16,
    borderRadius: 20,
    color: theme.colors.white,
    backgroundColor: theme.colors.orange,
})

const Header = styled('div', {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
})

const Name = styled('div', {
    flex: 1,
})

const IconWrapper = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 32,
    width: 32,
    background: theme.colors.white,
    color: theme.colors.orange,
    borderRadius: '100%',
})

const Balance = styled('div', {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    gap: 2,
    marginBottom: 20,
})

const Buttons = styled('div', {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,

    '@xs': {
        flexDirection: 'column',
    },
})

const CURRENCIES = {
    bitcoin: {
        name: 'words.bitcoin',
        icon: BitcoinIcon,
        color: theme.colors.orange,
        textColor: theme.colors.white,
        unit: 'sats',
    },
} as const
