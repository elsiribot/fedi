import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState, selectFederationMetadata } from '.'
import { SupportedCurrency } from '../types'
import {
    getFederationDefaultCurrency,
    getFederationFixedExchangeRate,
} from '../utils/FederationUtils'
import { loadFromStorage } from './storage'

type FiatPriceMap = {
    [currency in SupportedCurrency]: number
}

/*** Initial State ***/

const initialState = {
    prices: {} as FiatPriceMap,
    selectedFiatCurrency: null as SupportedCurrency | null,
    socketErrors: 0,
}

export type CurrencyState = typeof initialState

/*** Slice definition ***/

export const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        updateBtcFiatPrice(
            state,
            action: PayloadAction<{
                price: number
                currency: SupportedCurrency
            }>,
        ) {
            const { price, currency } = action.payload
            state.prices[currency] = price
        },
        incrementSocketErrors(state) {
            state.socketErrors = state.socketErrors + 1
        },
        changeSelectedFiatCurrency(
            state,
            action: PayloadAction<SupportedCurrency>,
        ) {
            state.selectedFiatCurrency = action.payload
        },
        resetCurrencyState() {
            return { ...initialState }
        },
    },
    extraReducers: builder => {
        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.selectedFiatCurrency = action.payload.currency
        })
    },
})

/*** Basic actions ***/

export const {
    updateBtcFiatPrice,
    changeSelectedFiatCurrency,
    resetCurrencyState,
} = currencySlice.actions

/*** Selectors ***/

export const selectCurrency = (s: CommonState) => {
    if (s.currency.selectedFiatCurrency) return s.currency.selectedFiatCurrency

    const metadata = selectFederationMetadata(s)
    if (metadata) {
        const federationDefaultCurrency = getFederationDefaultCurrency(metadata)
        if (federationDefaultCurrency) return federationDefaultCurrency
    }

    return SupportedCurrency.USD
}

export const selectBtcExchangeRate = (s: CommonState) => {
    const selectedFiatCurrency = selectCurrency(s)
    const metadata = selectFederationMetadata(s)

    let exchangeRate = s.currency.prices[selectedFiatCurrency] || 0

    // Special case for Togo farmers using CFA, where a metadata override
    // provides the exchange rate directly if the default_currency
    // is selected
    if (
        metadata &&
        metadata.default_currency &&
        metadata.default_currency === selectedFiatCurrency
    ) {
        const federationFixedExchangeRate =
            getFederationFixedExchangeRate(metadata)
        if (federationFixedExchangeRate) {
            exchangeRate = federationFixedExchangeRate
            return exchangeRate
        }
    }

    const eurPrice = s.currency.prices[SupportedCurrency.EUR] || 0

    // Special case for the CFA franc which is a fixed 650x the EUR price
    if (selectedFiatCurrency === SupportedCurrency.CFA) {
        exchangeRate = eurPrice * 650
    }
    // Special case for CZK which is a fixed 23.5x the EUR price
    if (selectedFiatCurrency === SupportedCurrency.CZK) {
        exchangeRate = eurPrice * 23.5
    }

    return exchangeRate
}
