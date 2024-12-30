import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import {
    CommonState,
    selectActiveFederationId,
    selectFederationMetadata,
    selectLoadedFederations,
    selectStabilityPoolCycleStartPrice,
} from '.'
import { Federation, SupportedCurrency } from '../types'
import {
    getFederationDefaultCurrency,
    getFederationFixedExchangeRate,
} from '../utils/FederationUtils'
import { makeLog } from '../utils/log'
import { loadFromStorage } from './storage'

const log = makeLog('redux/currency')

/*** Initial State ***/

const initialState = {
    btcUsdRate: 0 as number,
    fiatUsdRates: {} as Record<string, number | undefined>,
    selectedFiatCurrency: null as SupportedCurrency | null,
    currencyLocale: undefined as string | undefined,
    customFederationCurrencies: {} as Record<string, SupportedCurrency>,
}

export type CurrencyState = typeof initialState

/*** Slice definition ***/

export const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        changeSelectedFiatCurrency(
            state,
            action: PayloadAction<SupportedCurrency>,
        ) {
            state.selectedFiatCurrency = action.payload
        },
        setCurrencyLocale(state, action: PayloadAction<string>) {
            state.currencyLocale = action.payload
        },
        resetCurrencyState() {
            return { ...initialState }
        },
        setFederationCurrency(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                currency: SupportedCurrency
            }>,
        ) {
            state.customFederationCurrencies = {
                ...state.customFederationCurrencies,
                [action.payload.federationId]: action.payload.currency,
            }
        },
    },
    extraReducers: builder => {
        builder.addCase(fetchCurrencyPrices.fulfilled, (state, action) => {
            state.btcUsdRate = action.payload.btcUsdRate
            state.fiatUsdRates = {
                ...state.fiatUsdRates,
                ...action.payload.fiatUsdRates,
            }
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.selectedFiatCurrency = action.payload.currency
            state.btcUsdRate = action.payload.btcUsdRate
            state.fiatUsdRates = action.payload.fiatUsdRates
            state.customFederationCurrencies =
                action.payload.customFederationCurrencies
        })
    },
})

/*** Basic actions ***/

export const {
    changeSelectedFiatCurrency,
    setCurrencyLocale,
    resetCurrencyState,
    setFederationCurrency,
} = currencySlice.actions

/*** Async thunk actions ***/

export const fetchCurrencyPrices = createAsyncThunk<
    Pick<CurrencyState, 'btcUsdRate' | 'fiatUsdRates'>,
    void
>('currency/fetchCurrencyPrices', async () => {
    const response = await fetch('https://price-feed.dev.fedibtc.com/latest')
    const json: {
        prices: Record<string, { rate: number; timestamp: string }>
    } = await response.json()

    // Ensure we have BTC/USD, if we're missing that then something is very wrong.
    const btcUsdRate = json?.prices['BTC/USD']?.rate
    if (typeof btcUsdRate !== 'number') {
        log.warn(
            'No BTC/USD rate found in price feed, rejecting response',
            json,
        )
        throw new Error('Missing required BTC/USD rate from price feed')
    }

    // Map all other fiats automatically into their own object.
    const fiatUsdRates: CurrencyState['fiatUsdRates'] = {}
    Object.entries(json.prices).forEach(([currency, { rate }]) => {
        const [fiat, usd] = currency.split('/')
        if (usd !== 'USD' || fiat === 'BTC') return
        fiatUsdRates[fiat] = rate
    })

    return { btcUsdRate, fiatUsdRates }
})

/*** Selectors ***/

export const selectCurrencyLocale = (s: CommonState) =>
    s.currency.currencyLocale

export const selectCurrency = (s: CommonState) => {
    const federationId = selectActiveFederationId(s)

    if (!federationId) return SupportedCurrency.USD

    return selectFederationCurrency(s, federationId)
}

export const selectFederationDefaultCurrency = (
    s: CommonState,
    federationId: Federation['id'],
) => {
    const loadedFederations = selectLoadedFederations(s)
    const federation = loadedFederations.find(f => f.id === federationId)

    if (federation) {
        return (
            getFederationDefaultCurrency(federation.meta) ??
            SupportedCurrency.USD
        )
    }

    return SupportedCurrency.USD
}

export const selectFederationCurrency = (
    s: CommonState,
    federationId: string,
) => {
    const defaultCurrency = selectFederationDefaultCurrency(s, federationId)

    return (
        s.currency.customFederationCurrencies[federationId] ?? defaultCurrency
    )
}

export const selectFederationCurrencies = (
    s: CommonState,
    federationId: Federation['id'],
) => {
    const defaultCurrency = selectFederationDefaultCurrency(s, federationId)

    const sortedCurrencies = Object.entries(SupportedCurrency)
        .filter(([a]) => a !== defaultCurrency)
        .sort(([, a], [, b]) => a.localeCompare(b))

    return Object.fromEntries(sortedCurrencies)
}

export const selectBtcUsdExchangeRate = (
    s: CommonState,
    federationId?: Federation['id'],
) => {
    const stabilityPoolPrice = selectStabilityPoolCycleStartPrice(
        s,
        federationId,
    )
    return stabilityPoolPrice || s.currency.btcUsdRate || 0
}

export const selectBtcExchangeRate = (s: CommonState) => {
    const selectedFiatCurrency = selectCurrency(s)
    const metadata = selectFederationMetadata(s)
    const btcUsdRate = selectBtcUsdExchangeRate(s)

    let fiatUsdRate = s.currency.fiatUsdRates[selectedFiatCurrency] || 0

    // Special case for Togo farmers using CFA, where a metadata override
    // provides the exchange rate directly if the default_currency
    // is selected
    // TODO: Remove me? Do we want to keep supporting this feature?
    if (metadata) {
        const defaultCurrency = getFederationDefaultCurrency(metadata)
        if (defaultCurrency && defaultCurrency === selectedFiatCurrency) {
            const federationFixedExchangeRate =
                getFederationFixedExchangeRate(metadata)
            if (federationFixedExchangeRate) {
                return federationFixedExchangeRate
            }
        }
    }

    // Special case for the CFA franc which is a fixed rate to the dollar
    // TODO: Remove me when CFA is added to price oracle.
    if (selectedFiatCurrency === SupportedCurrency.CFA && !fiatUsdRate) {
        fiatUsdRate = 0.0016
    }

    return selectedFiatCurrency === SupportedCurrency.USD
        ? btcUsdRate
        : btcUsdRate / fiatUsdRate
}
