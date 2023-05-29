import React from 'react'
import { useTranslation } from 'react-i18next'

import BitcoinIcon from '@fedi/common/assets/svgs/bitcoin.svg'
import { Transaction, TransactionDirection } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { styled, theme } from '../styles'
import { Icon } from './Icon'
import { Text } from './Text'

interface Props {
    transaction: Transaction
    onClick(): void
}

export const TransactionRow: React.FC<Props> = ({
    transaction: txn,
    onClick,
}) => {
    const { t } = useTranslation()

    return (
        <Container onClick={onClick} type="button">
            <IconWrap>
                <Icon icon={BitcoinIcon} />
            </IconWrap>
            <Descriptor>
                <Text variant="caption" weight="medium">
                    {`${
                        txn.direction === TransactionDirection.send
                            ? t('words.sent')
                            : t('words.received')
                    } ${t('words.bitcoin').toLowerCase()}`}
                </Text>
                <Text variant="small" css={{ color: theme.colors.darkGrey }}>
                    {txn.notes}
                </Text>
            </Descriptor>

            <Details>
                <Amount>
                    <Text>
                        {txn.direction === TransactionDirection.send
                            ? '-'
                            : '+'}
                        {`${amountUtils.formatSats(
                            amountUtils.msatToSat(txn.amount),
                        )}`}
                    </Text>
                    <Text variant="tiny" ellipsize css={{ lineHeight: '16px' }}>
                        {t('words.sats').toUpperCase()}
                    </Text>
                </Amount>
                <Text variant="small" css={{ color: theme.colors.darkGrey }}>
                    {`${dateUtils.formatMessageItemTimestamp(txn.createdAt)}`}
                </Text>
            </Details>
        </Container>
    )
}

const Container = styled('button', {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    transition: 'background-color 100ms ease',

    '&:hover, &:focus': {
        background: 'rgba(0, 0, 0, 0.04)',
    },
})

const IconWrap = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
    height: 32,
    borderRadius: '100%',
    background: theme.colors.orange,
    color: theme.colors.white,
})

const Descriptor = styled('div', {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,

    '> *': {
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
})

const Details = styled('div', {
    textAlign: 'right',
})

const Amount = styled('div', {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 4,
    marginBottom: 6,
})
