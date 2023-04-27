import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useUpdatingRef } from '@fedi/common/hooks/util'
import { selectBtcExchangeRate, selectCurrency } from '@fedi/common/redux'
import { Btc, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector } from '../hooks'
import { keyframes, styled, theme } from '../styles'
import { Text } from './Text'

interface Props {
    amount: Sats
    error?: string
    readOnly?: boolean
    onChangeAmount?: (amount: Sats) => void
}

export const AmountInput: React.FC<Props> = ({
    amount,
    error,
    readOnly,
    onChangeAmount,
}) => {
    const { t } = useTranslation()
    const btcToFiatRate = useAppSelector(selectBtcExchangeRate)
    const btcToFiatRateRef = useUpdatingRef(btcToFiatRate)
    const currency = useAppSelector(selectCurrency)
    const [isFiat, setIsFiat] = useState(false)
    const [satsValue, setSatsValue] = useState<string>(
        amountUtils.formatSats(amount),
    )
    const [fiatValue, setFiatValue] = useState<string>(
        amountUtils.formatFiat(
            amountUtils.satToFiat(amount, btcToFiatRate),
            currency,
            { noSymbol: true },
        ),
    )

    const clampSats = useCallback((value: number) => {
        if (Number.isNaN(value)) return 0 as Sats
        return Math.round(Math.max(0, value)) as Sats
    }, [])

    const handleChangeSats = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            const sats = clampSats(
                parseInt(ev.currentTarget.value.replaceAll(',', ''), 10),
            )
            const fiat = amountUtils.satToBtc(sats) * btcToFiatRateRef.current
            onChangeAmount && onChangeAmount(clampSats(sats))
            setSatsValue(Intl.NumberFormat().format(sats))
            setFiatValue(
                amountUtils.formatFiat(fiat, currency, { noSymbol: true }),
            )
        },
        [clampSats, onChangeAmount, currency, btcToFiatRateRef],
    )

    const handleChangeFiat = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = ev.currentTarget
            let fiat = amountUtils.parseFiatString(value)
            if (Number.isNaN(fiat) || fiat < 0) {
                fiat = 0
            }

            // If they've added or removed a sigdig, offset all numbers by a tens place
            const decimals = amountUtils.getCurrencyDecimals(currency)
            const decimalSeparator = amountUtils.getDecimalSeparator()
            const valueDecimals = value.split(decimalSeparator)[1]?.length || 0
            if (valueDecimals > decimals) {
                fiat = fiat * 10
            } else if (valueDecimals < decimals) {
                fiat = fiat / 10
            }

            const sats = clampSats(
                amountUtils.btcToSat((fiat / btcToFiatRateRef.current) as Btc),
            )

            onChangeAmount && onChangeAmount(sats)
            setFiatValue(
                amountUtils.formatFiat(fiat, currency, { noSymbol: true }),
            )
            setSatsValue(amountUtils.formatSats(sats))
        },
        [clampSats, btcToFiatRateRef, onChangeAmount, currency],
    )

    const activeWrapProps = {
        active: true,
        readOnly,
        onClick: useCallback((ev: React.MouseEvent) => {
            ev.currentTarget.querySelector('input')?.focus()
        }, []),
    }
    const inactiveWrapProps = {
        active: false,
        readOnly,
        role: readOnly ? undefined : 'button',
        tabIndex: readOnly ? undefined : 0,
        onClick: useCallback(
            (ev: React.MouseEvent) => {
                if (readOnly) return
                setIsFiat(is => !is)
                ev.currentTarget.querySelector('input')?.focus()
            },
            [readOnly],
        ),
    }

    return (
        <Container
            css={{
                '--container-height': `88px`,
                '--error-height': error ? '28px' : '0px',
            }}>
            {error && (
                <Error>
                    <Text variant="caption" weight="medium">
                        {error}
                    </Text>
                </Error>
            )}
            <FieldWrap {...(isFiat ? inactiveWrapProps : activeWrapProps)}>
                <SnugInput>
                    <input
                        readOnly={isFiat || readOnly}
                        value={satsValue}
                        onChange={handleChangeSats}
                    />
                    <div>{satsValue}</div>
                </SnugInput>
                <span>{t('words.sats')}</span>
            </FieldWrap>
            <FieldWrap {...(isFiat ? activeWrapProps : inactiveWrapProps)}>
                <span>{amountUtils.getCurrencySymbol(currency)}</span>
                <SnugInput>
                    <input
                        readOnly={!isFiat || readOnly}
                        value={fiatValue}
                        onChange={handleChangeFiat}
                    />
                    <div>{fiatValue}</div>
                </SnugInput>
            </FieldWrap>
        </Container>
    )
}

const Container = styled('div', {
    position: 'relative',
    height: 'calc(var(--container-height) + var(--error-height))',
    transition: 'height 200ms ease',
})

const errorFadeDown = keyframes({
    '0%': { opacity: 0, transform: 'translateY(-10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' },
})

const Error = styled('div', {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: theme.colors.red,
    animation: `${errorFadeDown} 200ms ease`,
})

const FieldWrap = styled('div', {
    position: 'absolute',
    left: '50%',
    top: 0,
    maxWidth: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    overflow: 'hidden',
    transition: 'transform 200ms ease, color 200ms ease, opacity 200ms ease',

    // prefix
    '& > span:first-child': {
        fontSize: 32,
    },

    // suffix
    '& > span:last-child': {
        fontSize: 20,
        lineHeight: '42px',
        textTransform: 'uppercase',
        paddingLeft: 6,
    },

    variants: {
        active: {
            true: {
                transform: 'translateX(-50%) translateY(var(--error-height))',
            },
            false: {
                opacity: 0.5,
                transform: `
                    translateX(-50%)
                    translateY(var(--error-height))
                    translateY(var(--container-height))
                    translateY(-100%)
                    scale(0.6)
                `,
                cursor: 'pointer',

                '> *': {
                    pointerEvents: 'none',
                },
            },
        },
        readOnly: {
            true: {
                cursor: 'default !important',
            },
        },
    },
})

const SnugInput = styled('div', {
    height: 48,
    position: 'relative',

    '& > div, & > input': {
        fontSize: 32,
        lineHeight: '48px',
    },

    '& > div': {
        opacity: 0,
        visibility: 'hidden',
    },

    '& > input': {
        position: 'absolute',
        inset: 0,
        background: 'none',
        border: 'none',
        padding: 0,
        outline: 'none',
    },
})
