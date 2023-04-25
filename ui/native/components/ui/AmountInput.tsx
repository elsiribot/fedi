import { Text, Theme, useTheme } from '@rneui/themed'
import React, { RefObject, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, TextInput } from 'react-native'

import { selectBtcExchangeRate, selectCurrency } from '@fedi/common/redux'
import { Btc, Sats } from '@fedi/common/types'
import amountUtils from '@fedi/common/utils/AmountUtils'

import { useAppSelector, useUpdatingRef } from '../../state/hooks'
import InvisibleInput from './InvisibleInput'
import SvgImage from './SvgImage'

export type Props = {
    amount: Sats
    onChangeAmount?: (amount: Sats) => void
}

const AmountInput: React.FC<Props> = ({ amount, onChangeAmount }) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const inputRef = useRef<TextInput>(null)
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
        (value: string) => {
            const sats = clampSats(Number(value.replace(/,/g, '')))
            const fiat = amountUtils.satToBtc(sats) * btcToFiatRateRef.current
            onChangeAmount && onChangeAmount(sats)
            setSatsValue(Intl.NumberFormat().format(sats))
            setFiatValue(
                amountUtils.formatFiat(fiat, currency, { noSymbol: true }),
            )
        },
        [clampSats, onChangeAmount, currency, btcToFiatRateRef],
    )

    const handleChangeFiat = useCallback(
        (value: string) => {
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

    return (
        <Pressable
            style={styles(theme).container}
            onPress={() => inputRef?.current?.focus()}>
            {isFiat ? (
                <InvisibleInput
                    inputRef={inputRef as RefObject<TextInput>}
                    onChangeText={handleChangeFiat}
                    value={fiatValue}
                    label={amountUtils.getCurrencySymbol(currency)}
                    labelPosition={'left'}
                />
            ) : (
                <InvisibleInput
                    inputRef={inputRef as RefObject<TextInput>}
                    onChangeText={handleChangeSats}
                    value={satsValue}
                    label={t('words.sats').toUpperCase()}
                />
            )}
            <Pressable style={styles(theme).symbolSwitcher}>
                <Text style={styles(theme).secondaryAmountText}>
                    {isFiat
                        ? `${satsValue} ${t('words.sats').toUpperCase()}`
                        : `${amountUtils.getCurrencySymbol(
                              currency,
                          )} ${fiatValue}`}
                </Text>
                <Pressable onPress={() => setIsFiat(!isFiat)}>
                    <SvgImage name="Switch" color={theme.colors.grey} />
                </Pressable>
            </Pressable>
        </Pressable>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            marginTop: 'auto',
            marginHorizontal: theme.spacing.xl,
        },
        secondaryAmountText: {
            color: theme.colors.darkGrey,
            textAlign: 'center',
            marginHorizontal: theme.spacing.sm,
        },
        symbolSwitcher: {
            flexDirection: 'row',
            alignItems: 'center',
        },
    })

export default AmountInput
