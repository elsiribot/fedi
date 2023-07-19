import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useAmountInput } from '@fedi/common/hooks/amount'
import { Sats } from '@fedi/common/types'

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
    const {
        isFiat,
        setIsFiat,
        satsValue,
        fiatValue,
        handleChangeFiat,
        handleChangeSats,
        currencySymbol,
    } = useAmountInput(amount, onChangeAmount)

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
            [readOnly, setIsFiat],
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
                        onChange={ev =>
                            handleChangeSats(ev.currentTarget.value)
                        }
                    />
                    <div>{satsValue}</div>
                </SnugInput>
                <span>{t('words.sats')}</span>
            </FieldWrap>
            <FieldWrap {...(isFiat ? activeWrapProps : inactiveWrapProps)}>
                <span>{currencySymbol}</span>
                <SnugInput>
                    <input
                        readOnly={!isFiat || readOnly}
                        value={fiatValue}
                        inputMode="decimal"
                        onChange={ev =>
                            handleChangeFiat(ev.currentTarget.value)
                        }
                    />
                    <div>{fiatValue}</div>
                </SnugInput>
            </FieldWrap>
        </Container>
    )
}

const Container = styled('div', {
    position: 'relative',
    width: '100%',
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
