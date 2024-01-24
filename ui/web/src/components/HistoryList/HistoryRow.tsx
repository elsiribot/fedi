import React from 'react'

import { selectBtcExchangeRate, selectCurrency } from '@fedi/common/redux'
import { MSats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'
import dateUtils from '@fedi/common/utils/DateUtils'

import { useAppSelector } from '../../hooks'
import { styled, theme } from '../../styles'
import { Text } from '../Text'

export interface HistoryRowProps {
    icon: React.ReactNode
    status: React.ReactNode
    notes: React.ReactNode
    amount: MSats | string
    timestamp: number | undefined | null
    direction?: 'incoming' | 'outgoing' | 'stale'
    onSelect: () => void
}

export const HistoryRow: React.FC<HistoryRowProps> = ({
    icon,
    status,
    notes,
    amount,
    timestamp,
    direction,
    onSelect,
}) => {
    const currency = useAppSelector(selectCurrency)
    const btcExchangeRate = useAppSelector(selectBtcExchangeRate)

    let amountNode: React.ReactNode
    const sign = direction
        ? direction === 'stale'
            ? ''
            : direction === 'outgoing'
            ? `-`
            : `+`
        : ''
    if (typeof amount === 'number') {
        const fiatAmount = amountUtils.msatToFiat(amount, btcExchangeRate)
        const formattedAmount = amountUtils.formatFiat(fiatAmount, currency, {
            noSymbol: true,
        })
        amountNode = (
            <Amount>
                <Text variant="caption" weight="medium">
                    {sign}
                    {formattedAmount}
                </Text>
                <Text variant="tiny" weight="medium">
                    {currency}
                </Text>
            </Amount>
        )
    } else {
        amountNode = (
            <Amount>
                <Text variant="caption" weight="medium">
                    {sign}
                    {amount}
                </Text>
            </Amount>
        )
    }

    return (
        <Container onClick={onSelect} type="button">
            <IconWrap>{icon}</IconWrap>
            <Descriptor>
                <Text variant="caption" weight="medium">
                    {status}
                </Text>
                {notes && (
                    <Text
                        variant="small"
                        css={{ color: theme.colors.darkGrey }}
                        ellipsize>
                        {notes}
                    </Text>
                )}
            </Descriptor>

            <Details>
                {amountNode}
                {timestamp && (
                    <Text
                        variant="small"
                        css={{ color: theme.colors.darkGrey }}>
                        {`${dateUtils.formatMessageItemTimestamp(timestamp)}`}
                    </Text>
                )}
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

    '@sm': {
        borderRadius: 0,
        paddingLeft: 24,
        paddingRight: 24,
    },
})

const IconWrap = styled('div', {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 2,
    marginBottom: 4,
})
