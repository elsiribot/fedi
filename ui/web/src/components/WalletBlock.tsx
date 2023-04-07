import React from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { styled, theme } from '../styles'
import { Icon } from './Icon'
import { Text } from './Text'
import { Button } from './Button'
import BitcoinIcon from '@fedi/common/assets/svgs/bitcoin.svg'
import ListIcon from '@fedi/common/assets/svgs/list.svg'

interface Props {
    currency: keyof typeof CURRENCIES
}

export const WalletBlock: React.FC<Props> = ({ currency }) => {
    const { t } = useTranslation()

    const currencyInfo = CURRENCIES[currency]
    return (
        <Container
            css={{
                backgroundColor: currencyInfo.color,
                color: currencyInfo.textColor,
            }}>
            <Header>
                <IconWrapper
                    css={{
                        backgroundColor: currencyInfo.textColor,
                        color: currencyInfo.color,
                    }}>
                    <Icon size="md" icon={currencyInfo.icon} />
                </IconWrapper>
                <Name>
                    <Text weight="bold">{t(currencyInfo.name)}</Text>
                </Name>
                <Link href="/transactions/bitcoin">
                    <Icon icon={ListIcon} />
                </Link>
            </Header>
            <Balance>
                <Text variant="h2" weight="normal">
                    $110.98
                </Text>
                <Text variant="caption" weight="medium">
                    12,250 sats
                </Text>
            </Balance>
            <Buttons>
                <Button variant="secondary" width="full">
                    Request
                </Button>
                <Button variant="secondary" width="full">
                    Send
                </Button>
            </Buttons>
        </Container>
    )
}

const Container = styled('div', {
    padding: 16,
    borderRadius: 20,
    color: theme.colors.white,
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
    },
} as const
