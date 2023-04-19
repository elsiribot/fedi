import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Btc, Sats } from '@fedi/common/types'
import AmountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector, useUpdatingRef } from '../hooks'
import { keyframes, styled, theme } from '../styles'
import { Text } from './Text'

interface Props {
    amount: Sats
    max?: number
    error?: string
    readOnly?: boolean
    onChangeAmount(amount: Sats): void
}

export const AmountInput: React.FC<Props> = ({
    amount,
    error,
    readOnly,
    onChangeAmount,
}) => {
    const { t } = useTranslation()
    const btcToUsd = useAppSelector(s => s.currency.btcUsdPrice)
    const btcToUsdRef = useUpdatingRef(btcToUsd)
    const [isFiat, setIsFiat] = useState(false)
    const [fiatAmount, setFiatAmount] = useState<string>(
        AmountUtils.satToUsdString(amount, btcToUsd),
    )

    const clampSats = useCallback((value: number) => {
        if (Number.isNaN(value)) return 0 as Sats
        return Math.round(Math.max(0, value)) as Sats
    }, [])

    const handleChangeSats = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            const sats = parseInt(
                ev.currentTarget.value.replaceAll(',', ''),
                10,
            )
            onChangeAmount(clampSats(sats))
        },
        [clampSats, onChangeAmount],
    )

    const handleChangeFiat = useCallback(
        (ev: React.ChangeEvent<HTMLInputElement>) => {
            const { value } = ev.currentTarget
            let fiat = parseFloat(value.replaceAll(',', ''))

            // If they've added an additional sigdig to the right, offset all numbers by one
            if (value.split('.')[1]?.length > 2) {
                fiat = parseFloat(value) * 10
            }

            const sats = AmountUtils.btcToSat(
                (fiat / btcToUsdRef.current) as Btc,
            )

            onChangeAmount(clampSats(sats))
            setFiatAmount(
                Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    currencyDisplay: 'code',
                })
                    .format(fiat)
                    .replace('USD', '')
                    .trim(),
            )
        },
        [clampSats, btcToUsdRef, onChangeAmount],
    )

    // Update fiat amount when amount changes
    useEffect(() => {
        setFiatAmount(AmountUtils.satToUsdString(amount, btcToUsdRef.current))
    }, [amount, btcToUsdRef])

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

    // When we're editing fiat, force the input to use our local state, not calculated.
    // Otherwise you encounter rounding issues while typing.
    const fiatValue = isFiat
        ? fiatAmount
        : AmountUtils.satToUsdString(amount, btcToUsd)
    const satsValue = Intl.NumberFormat('en-US').format(amount)
    console.log({ fiatValue })

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
                        pattern="[0-9]+"
                    />
                    <div>{satsValue}</div>
                </SnugInput>
                <span>{t('words.sats')}</span>
            </FieldWrap>
            <FieldWrap {...(isFiat ? activeWrapProps : inactiveWrapProps)}>
                <span>$</span>
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

// const testAnimation = keyframes({
//     '0%': {

//     },
//     '100%': {
//         transfor:
//     },
// })

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
                cursor: 'default',
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
