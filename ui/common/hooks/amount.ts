import { TFunction } from 'i18next'
import { useState, useCallback, useMemo } from 'react'
import { RequestInvoiceArgs } from 'webln'

import {
    selectBtcExchangeRate,
    selectCurrency,
    selectMaxReceiveAmount,
    selectFederationMetadata,
    selectFederationBalance,
    selectAmountInputType,
    setAmountInputType,
    selectBtcUsdExchangeRate,
    selectMinimumDepositAmount,
    selectWithdrawableStableBalanceMsats,
    selectMinimumWithdrawAmountMsats,
} from '../redux'
import {
    Btc,
    Invoice,
    MSats,
    ParsedLnurlPay,
    ParsedLnurlWithdraw,
    Sats,
    SupportedCurrency,
} from '../types'
import amountUtils from '../utils/AmountUtils'
import { getFederationDefaultCurrency } from '../utils/FederationUtils'
import { useCommonDispatch, useCommonSelector } from './redux'
import { useUpdatingRef } from './util'

interface RequestAmountArgs {
    lnurlWithdrawal?: ParsedLnurlWithdraw['data'] | null
    requestInvoiceArgs?: RequestInvoiceArgs | null
}

interface SendAmountArgs {
    invoice?: Invoice | null
    lnurlPayment?: ParsedLnurlPay['data'] | null
}

// prettier-ignore
const numpadButtons = [
    1, 2, 3,
    4, 5, 6,
    7, 8, 9,
    null, 0, 'backspace',
] as const

export type NumpadButtonValue = (typeof numpadButtons)[number]

/**
 * Provides state for rendering a balance amount in fiat and sats.
 */
export function useBalance() {
    const btcToFiatRate = useCommonSelector(selectBtcExchangeRate)
    const currency = useCommonSelector(selectCurrency)
    const balance = useCommonSelector(selectFederationBalance) as MSats

    const satsBalance = amountUtils.formatSats(amountUtils.msatToSat(balance))
    const fiatBalance = amountUtils.formatFiat(
        amountUtils.msatToFiat(balance, btcToFiatRate),
        currency,
        { noSymbol: true },
    )
    const fiatBalanceWithSymbol = amountUtils.formatFiat(
        amountUtils.msatToFiat(balance, btcToFiatRate),
        currency,
    )

    const currencySymbol = useMemo(
        () => amountUtils.getCurrencySymbol(currency),
        [currency],
    )

    return {
        satsBalance,
        satsBalanceWithSymbol: `${satsBalance} SATS`,
        fiatBalance,
        fiatBalanceWithSymbol,
        currency,
        currencySymbol,
    }
}

export const useBtcFiatPrice = () => {
    const selectedFiatCurrency = useCommonSelector(selectCurrency)
    const exchangeRate: number = useCommonSelector(selectBtcExchangeRate)
    const btcUsdExchangeRate: number = useCommonSelector(
        selectBtcUsdExchangeRate,
    )

    return {
        convertSatsToFiat: useCallback(
            (sats: Sats) => {
                return amountUtils.satToFiat(sats, exchangeRate)
            },
            [exchangeRate],
        ),
        convertSatsToFiatString: useCallback(
            (sats: Sats) => {
                return amountUtils.satToFiatString(sats, exchangeRate)
            },
            [exchangeRate],
        ),
        convertSatsToFormattedFiat: useCallback(
            (sats: Sats) => {
                const amount = amountUtils.satToFiat(sats, exchangeRate)
                return amountUtils.formatFiat(amount, selectedFiatCurrency)
            },
            [exchangeRate, selectedFiatCurrency],
        ),
        convertSatsToFormattedUsd: useCallback(
            (sats: Sats) => {
                const amount = amountUtils.satToFiat(sats, btcUsdExchangeRate)
                return amountUtils.formatFiat(amount, SupportedCurrency.USD)
            },
            [btcUsdExchangeRate],
        ),
    }
}

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
    const dispatch = useCommonDispatch()
    const btcToFiatRate = useCommonSelector(selectBtcExchangeRate)
    const btcToFiatRateRef = useUpdatingRef(btcToFiatRate)
    const currency = useCommonSelector(selectCurrency)
    const federationMetadata = useCommonSelector(selectFederationMetadata)
    const defaultAmountInputType = useCommonSelector(selectAmountInputType)

    // If the user has changed amount input type before, default to that.
    // Otherwise default to whether or not the federation dictates a currency type.
    const shouldDefaultToFiat = defaultAmountInputType
        ? defaultAmountInputType === 'fiat'
        : !!getFederationDefaultCurrency(federationMetadata)

    const [isFiat, _setIsFiat] = useState<boolean>(shouldDefaultToFiat)

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

    const setIsFiat = useCallback(
        (value: boolean) => {
            _setIsFiat(value)
            dispatch(setAmountInputType(value ? 'fiat' : 'sats'))
        },
        [dispatch],
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

            let sats = clampSats(
                amountUtils.btcToSat((fiat / btcToFiatRateRef.current) as Btc),
            )

            // If the amount is being entered as fiat, the equivalent amount in sats
            // will sometimes be slightly above or below the min/max (in sats)
            // UX expectation is that the entered amount is exactly equal to the min/max amount
            // This logic ensures to round the min/max (in fiat) down to the nearest 0.01 to
            // include the entered amount into the rounding threshold to qualify as a min/max input
            if (minimumAmount) {
                const minFiat =
                    amountUtils.satToBtc(minimumAmount as Sats) *
                    btcToFiatRateRef.current
                if (Number(minFiat.toFixed(2)) === fiat && fiat > 0) {
                    sats = minimumAmount
                }
            }
            if (maximumAmount) {
                const maxFiat =
                    amountUtils.satToBtc(maximumAmount as Sats) *
                    btcToFiatRateRef.current
                if (Number(maxFiat.toFixed(2)) === fiat && fiat > 0) {
                    sats = maximumAmount
                }
            }

            onChangeAmount && onChangeAmount(sats)
            setFiatValue(
                amountUtils.formatFiat(fiat, currency, { noSymbol: true }),
            )
            setSatsValue(amountUtils.formatSats(sats))
        },
        [
            currency,
            clampSats,
            btcToFiatRateRef,
            maximumAmount,
            minimumAmount,
            onChangeAmount,
        ],
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
                fiatValue: amountUtils.satToFiat(
                    maximumAmount,
                    btcToFiatRateRef.current,
                ),
                onlyShowOnSubmit: false,
            } as const
        }
        if (minimumAmount && amount < minimumAmount) {
            return {
                i18nKey: 'errors.invalid-amount-min',
                amount: minimumAmount,
                fiatValue: amountUtils.satToFiat(
                    minimumAmount,
                    btcToFiatRateRef.current,
                ),
                onlyShowOnSubmit: true,
            } as const
        }
    }, [amount, btcToFiatRateRef, minimumAmount, maximumAmount])

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
    lnurlWithdrawal,
    requestInvoiceArgs,
}: RequestAmountArgs = {}) {
    const maxReceiveAmount = useCommonSelector(selectMaxReceiveAmount)

    return useMemo(() => {
        let minimumAmount = 1 as Sats
        let maximumAmount = maxReceiveAmount
        if (lnurlWithdrawal) {
            if (lnurlWithdrawal.minWithdrawable) {
                minimumAmount = Math.max(
                    amountUtils.msatToSat(lnurlWithdrawal.minWithdrawable),
                    minimumAmount,
                ) as Sats
            }
            if (lnurlWithdrawal.maxWithdrawable) {
                maximumAmount = Math.min(
                    amountUtils.msatToSat(lnurlWithdrawal.maxWithdrawable),
                    maximumAmount,
                ) as Sats
            }
        }
        if (requestInvoiceArgs) {
            if (requestInvoiceArgs.minimumAmount) {
                minimumAmount = Math.max(
                    parseInt(requestInvoiceArgs.minimumAmount as string, 10),
                    minimumAmount,
                ) as Sats
            }
            if (requestInvoiceArgs.maximumAmount) {
                maximumAmount = Math.min(
                    parseInt(requestInvoiceArgs.maximumAmount as string, 10),
                    maximumAmount,
                ) as Sats
            }
        }
        return { minimumAmount, maximumAmount }
    }, [maxReceiveAmount, lnurlWithdrawal, requestInvoiceArgs])
}

/**
 * Get the minimum and maximum amount you can send. Optionally take in an
 * LNURL pay request as part of the calculation.
 */
export function useMinMaxSendAmount({
    invoice,
    lnurlPayment,
}: SendAmountArgs = {}) {
    const balance = useCommonSelector(selectFederationBalance)

    const invoiceAmount = invoice?.amount
    const { minSendable, maxSendable } = lnurlPayment || {}

    return useMemo(() => {
        let minimumAmount = 1 as Sats // Cannot send millisat amounts
        let maximumAmount = 1_000_000_000_000_000 as Sats // MAX_SAFE_INTEGER rounded down
        if (balance) {
            maximumAmount = amountUtils.msatToSat(balance)
        }
        if (invoiceAmount) {
            minimumAmount = amountUtils.msatToSat(invoiceAmount)
        } else {
            if (minSendable) {
                minimumAmount = amountUtils.msatToSat(minSendable)
            }
            if (maxSendable) {
                maximumAmount = Math.min(
                    amountUtils.msatToSat(maxSendable),
                    maximumAmount || Infinity,
                ) as Sats
            }
        }
        return { minimumAmount, maximumAmount }
    }, [balance, invoiceAmount, minSendable, maxSendable])
}

/**
 * Get the minimum and maximum amount you can withdraw from the stable balance
 */
export function useMinMaxWithdrawAmount() {
    const minimumMsats = useCommonSelector(selectMinimumWithdrawAmountMsats)
    const withdrawableMsats = useCommonSelector(
        selectWithdrawableStableBalanceMsats,
    )
    const minimumAmount = amountUtils.msatToSat(minimumMsats)
    const maximumAmount = amountUtils.msatToSat(withdrawableMsats)

    return { minimumAmount, maximumAmount }
}

/**
 * Get the minimum and maximum amount you can deposit to the stable balance
 */
export function useMinMaxDepositAmount() {
    const minimumAmount = useCommonSelector(selectMinimumDepositAmount)
    const balanceMSats = useCommonSelector(selectFederationBalance)
    const maximumAmount = amountUtils.msatToSat(balanceMSats)

    return { minimumAmount, maximumAmount }
}

/**
 * Provide all the state necessary to implement a request form that generates
 * a Lightning invoice. Optionally provide a set of WebLN requestInvoice args
 * or an LNURL withdrawal.
 */
export function useRequestForm(args: RequestAmountArgs = {}) {
    const { minimumAmount, maximumAmount } = useMinMaxRequestAmount(args)
    const [inputAmount, setInputAmount] = useState(
        getDefaultRequestAmount(args),
    )
    const [memo, setMemo] = useState(getDefaultRequestMemo(args))
    const argsRef = useUpdatingRef(args)

    const reset = useCallback(() => {
        setInputAmount(getDefaultRequestAmount(argsRef.current))
        setMemo(getDefaultRequestMemo(argsRef.current))
    }, [argsRef])

    // Determine if they should be able to change the amount, or if an exact
    // amount is requested.
    let exactAmount: Sats | undefined = undefined
    if (
        args.lnurlWithdrawal &&
        args.lnurlWithdrawal.minWithdrawable &&
        args.lnurlWithdrawal.minWithdrawable ===
            args.lnurlWithdrawal.maxWithdrawable
    ) {
        exactAmount = amountUtils.msatToSat(
            args.lnurlWithdrawal.minWithdrawable,
        )
    }
    if (args.requestInvoiceArgs?.amount) {
        exactAmount = parseInt(
            args.requestInvoiceArgs.amount as string,
            10,
        ) as Sats
    }

    return {
        inputAmount,
        setInputAmount,
        memo,
        setMemo,
        exactAmount,
        minimumAmount,
        maximumAmount,
        reset,
    }
}

function getDefaultRequestAmount({
    requestInvoiceArgs,
    lnurlWithdrawal,
}: RequestAmountArgs) {
    if (lnurlWithdrawal?.maxWithdrawable) {
        return amountUtils.msatToSat(lnurlWithdrawal?.maxWithdrawable)
    }
    if (requestInvoiceArgs?.amount) {
        return parseInt(requestInvoiceArgs.amount as string, 10) as Sats
    }
    if (requestInvoiceArgs?.defaultAmount) {
        return parseInt(requestInvoiceArgs.defaultAmount as string, 10) as Sats
    }
    return 0 as Sats
}

function getDefaultRequestMemo({
    requestInvoiceArgs,
    lnurlWithdrawal,
}: RequestAmountArgs) {
    if (lnurlWithdrawal?.defaultDescription) {
        return lnurlWithdrawal.defaultDescription
    }
    if (requestInvoiceArgs?.defaultMemo) {
        return requestInvoiceArgs.defaultMemo
    }
    return ''
}

/**
 * Provide all the state necessary to implement a pay form that generates
 * a Lightning invoice. Optionally provide an LNURL pay request.
 */
export function useSendForm({ invoice, lnurlPayment }: SendAmountArgs = {}) {
    const [inputAmount, setInputAmount] = useState<Sats>(0 as Sats)
    const { minimumAmount, maximumAmount } = useMinMaxSendAmount({
        invoice,
        lnurlPayment,
    })
    const minimumAmountRef = useUpdatingRef(minimumAmount)

    // Determine if they should be able to change the amount, or if an exact
    // amount is requested.
    let exactAmount: Sats | undefined = undefined
    let description: string | undefined
    if (invoice) {
        exactAmount = amountUtils.msatToSat(invoice.amount)
        description = invoice.description
    } else if (
        lnurlPayment &&
        lnurlPayment.minSendable &&
        lnurlPayment.minSendable === lnurlPayment.maxSendable
    ) {
        exactAmount = amountUtils.msatToSat(lnurlPayment.minSendable)
        description = lnurlPayment.description
    }

    const reset = useCallback(() => {
        setInputAmount(minimumAmountRef.current)
    }, [minimumAmountRef])

    return {
        inputAmount,
        setInputAmount,
        description,
        exactAmount,
        minimumAmount,
        maximumAmount,
        reset,
    }
}

/**
 * Provide all the state necessary to implement a stabilitypool withdrawal form
 * that decreases the stable USD balance in the wallet
 */
export function useWithdrawForm() {
    const [inputAmount, setInputAmount] = useState<Sats>(0 as Sats)
    const { minimumAmount, maximumAmount } = useMinMaxWithdrawAmount()

    return {
        inputAmount,
        setInputAmount,
        minimumAmount,
        maximumAmount,
    }
}

/**
 * Provide all the state necessary to implement a stabilitypool deposit form
 * that increases the stable USD balance in the wallet
 */
export function useDepositForm() {
    const btcToFiatRate = useCommonSelector(selectBtcExchangeRate)
    const currency = useCommonSelector(selectCurrency)
    const [inputAmount, setInputAmount] = useState<Sats>(0 as Sats)
    const { minimumAmount, maximumAmount } = useMinMaxDepositAmount()

    const maximumFiatAmount = amountUtils.formatFiat(
        amountUtils.satToFiat(maximumAmount, btcToFiatRate),
        currency,
    )

    return {
        inputAmount,
        setInputAmount,
        minimumAmount,
        maximumAmount,
        maximumFiatAmount,
    }
}

/**
 * Provides a string displaying the balance as both fiat and sat.
 */
export function useBalanceDisplay(t: TFunction) {
    const balance = useCommonSelector(selectFederationBalance)
    const currency = useCommonSelector(selectCurrency)
    const btcExchangeRate = useCommonSelector(selectBtcExchangeRate)

    const fiatString = `${amountUtils.formatFiat(
        amountUtils.msatToBtc(balance) * btcExchangeRate,
        currency,
        { noSymbol: true },
    )} ${currency}`
    const satString = `${amountUtils.formatNumber(
        amountUtils.msatToSat(balance),
    )} ${t('words.sats').toUpperCase()}`

    return `${t('words.balance')}: ${fiatString} (${satString})`
}
