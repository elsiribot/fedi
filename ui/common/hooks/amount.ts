import { useState, useCallback, useMemo } from 'react'
import { RequestInvoiceArgs } from 'webln'

import {
    selectBtcExchangeRate,
    selectCurrency,
    selectMaxReceiveAmount,
    selectFederationMetadata,
    selectFederationBalance,
} from '../redux'
import { Btc, ParsedLnurlPay, ParsedLnurlWithdraw, Sats } from '../types'
import amountUtils from '../utils/AmountUtils'
import { getFederationDefaultCurrency } from '../utils/FederationUtils'
import { useCommonSelector } from './redux'
import { useUpdatingRef } from './util'

// prettier-ignore
const numpadButtons = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
    null, 0, 'backspace',
] as const

/**
 * Provides state, callbacks, and misc information for rendering an amount
 * input that allows entry in both fiat and sats.
 */
export function useAmountInput(
    amount: Sats,
    onChangeAmount?: (amount: Sats) => void,
    minimumAmount?: Sats | null,
    maximumAmount?: Sats | null,
) {
    const btcToFiatRate = useCommonSelector(selectBtcExchangeRate)
    const btcToFiatRateRef = useUpdatingRef(btcToFiatRate)
    const currency = useCommonSelector(selectCurrency)

    // If the federation has a default currency set, isFiat starts as true
    const federationMetadata = useCommonSelector(selectFederationMetadata)
    const shouldDefaultToFiat =
        getFederationDefaultCurrency(federationMetadata) !== null ? true : false
    const [isFiat, setIsFiat] = useState<boolean>(shouldDefaultToFiat)

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
            // can be 1,000 or 1.000 or 1 000
            const thousandsSeparator = amountUtils.getThousandsSeparator()
            // replacing periods requires a special regex
            let escapeSeparator = thousandsSeparator
            if (thousandsSeparator === '.') {
                escapeSeparator = '\\.'
            }
            const regex = new RegExp(escapeSeparator, 'g')
            const sats = clampSats(parseInt(value.replace(regex, ''), 10))
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

    const handleNumpadPress = useCallback(
        (button: (typeof numpadButtons)[number]) => {
            if (button === null) return
            const value = isFiat ? fiatValue : satsValue
            const handleChange = isFiat ? handleChangeFiat : handleChangeSats
            if (button === 'backspace') {
                handleChange(value.slice(0, -1))
            } else {
                handleChange(`${value}${button}`)
            }
        },
        [isFiat, fiatValue, satsValue, handleChangeFiat, handleChangeSats],
    )

    const currencySymbol = useMemo(
        () => amountUtils.getCurrencySymbol(currency),
        [currency],
    )

    const validation = useMemo(() => {
        if (maximumAmount && amount > maximumAmount) {
            return {
                i18nKey: 'errors.invalid-amount-max',
                amount: maximumAmount,
                onlyShowOnSubmit: false,
            } as const
        }
        if (minimumAmount && amount < minimumAmount) {
            return {
                i18nKey: 'errors.invalid-amount-min',
                amount: minimumAmount,
                onlyShowOnSubmit: true,
            } as const
        }
    }, [amount, minimumAmount, maximumAmount])

    return {
        isFiat,
        setIsFiat,
        satsValue,
        fiatValue,
        handleChangeFiat,
        handleChangeSats,
        currency,
        currencySymbol,
        numpadButtons,
        handleNumpadPress,
        validation,
    }
}

/**
 * Get the minimum and maximum amount you can receive. Optionally take in an
 * LNURL withdrawal or WebLN invoice request as part of the calculation.
 */
export function useMinMaxRequestAmount({
    lnurlWithdraw,
    weblnRequest,
}: {
    lnurlWithdraw?: ParsedLnurlWithdraw | null
    weblnRequest?: RequestInvoiceArgs | null
} = {}) {
    const maxReceiveAmount = useCommonSelector(selectMaxReceiveAmount)

    return useMemo(() => {
        let minimumAmount = 1 as Sats
        let maximumAmount = maxReceiveAmount
        if (lnurlWithdraw) {
            if (lnurlWithdraw.data.minWithdrawable) {
                minimumAmount = Math.max(
                    amountUtils.msatToSat(lnurlWithdraw.data.minWithdrawable),
                    minimumAmount,
                ) as Sats
            }
            if (lnurlWithdraw.data.maxWithdrawable) {
                maximumAmount = Math.min(
                    amountUtils.msatToSat(lnurlWithdraw.data.maxWithdrawable),
                    maximumAmount,
                ) as Sats
            }
        }
        if (weblnRequest) {
            if (weblnRequest.minimumAmount) {
                minimumAmount = Math.max(
                    parseInt(weblnRequest.minimumAmount as string, 10),
                    minimumAmount,
                ) as Sats
            }
            if (weblnRequest.maximumAmount) {
                maximumAmount = Math.min(
                    parseInt(weblnRequest.maximumAmount as string, 10),
                    maximumAmount,
                ) as Sats
            }
        }
        return { minimumAmount, maximumAmount }
    }, [maxReceiveAmount, lnurlWithdraw, weblnRequest])
}

/**
 * Get the minimum and maximum amount you can send. Optionally take in an
 * LNURL pay request as part of the calculation.
 */
export function useMinMaxSendAmount({
    lnurlPay,
}: { lnurlPay?: ParsedLnurlPay } = {}) {
    const balance = useCommonSelector(selectFederationBalance)

    return useMemo(() => {
        let minimumAmount = 1 as Sats // Cannot send millisat amounts
        let maximumAmount = 1_000_000_000_000_000 as Sats // MAX_SAFE_INTEGER rounded down
        if (balance) {
            maximumAmount = amountUtils.msatToSat(balance)
        }
        if (lnurlPay) {
            if (lnurlPay.data.minSendable) {
                minimumAmount = amountUtils.msatToSat(lnurlPay.data.minSendable)
            }
            if (lnurlPay.data.maxSendable) {
                maximumAmount = Math.min(
                    amountUtils.msatToSat(lnurlPay.data.maxSendable),
                    maximumAmount || Infinity,
                ) as Sats
            }
        }
        return { minimumAmount, maximumAmount }
    }, [balance, lnurlPay])
}
