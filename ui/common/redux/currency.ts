import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState, selectActiveFederation } from '.'
import { SupportedCurrency } from '../types'
import FederationUtils from '../utils/FederationUtils'

type FiatPriceMap = {
    [currency in SupportedCurrency]: number
}

/*** Initial State ***/

const initialState = {
    prices: {} as FiatPriceMap,
    selectedFiatCurrency: SupportedCurrency.USD,
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
})

/*** Basic actions ***/

export const {
    updateBtcFiatPrice,
    changeSelectedFiatCurrency,
    resetCurrencyState,
} = currencySlice.actions

/*** Async thunk actions ***/

/**
 * Opens a socket to continuously monitor prices. Will automatically attempt
 * retries if the connection is lost.
 */
export const watchPrices = createAsyncThunk<void, void, { state: CommonState }>(
    'currency/watchPrices',
    async (_, { dispatch, getState }) => {
        // See docs at https://docs.bitfinex.com/docs/ws-general
        const usdSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2')

        usdSocket.onopen = () => {
            usdSocket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCUSD',
                }),
            )
        }

        usdSocket.onmessage = (message: any) => {
            console.log('message', message)
            const parsedData = JSON.parse(message.data)
            if (parsedData.length === 2 && parsedData[1].length === 10) {
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                dispatch(
                    updateBtcFiatPrice({
                        currency: SupportedCurrency.USD,
                        price: updatedPrice,
                    }),
                )
            }
        }

        // Re-try connection on closing, with a backoff.
        usdSocket.onclose = () => {
            const { socketErrors } = getState().currency
            setTimeout(() => {
                dispatch(currencySlice.actions.incrementSocketErrors())
                dispatch(watchPrices())
            }, 1000 * socketErrors)
        }

        const eurSocket = new WebSocket('wss://api-pub.bitfinex.com/ws/2')

        eurSocket.onopen = () => {
            eurSocket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCEUR',
                }),
            )
        }

        eurSocket.onmessage = (message: any) => {
            const parsedData = JSON.parse(message.data)
            if (parsedData.length === 2 && parsedData[1].length === 10) {
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                dispatch(
                    updateBtcFiatPrice({
                        currency: SupportedCurrency.EUR,
                        price: updatedPrice,
                    }),
                )
            }
        }
    },
)

/*** Selectors ***/

export const selectCurrency = (s: CommonState) => {
    if (s.currency.selectedFiatCurrency) return s.currency.selectedFiatCurrency

    const activeFederation = selectActiveFederation(s)
    if (activeFederation) {
        const federationDefaultCurrency = new FederationUtils(
            activeFederation!,
        ).getDefaultCurrency()
        if (federationDefaultCurrency) return federationDefaultCurrency
    }

    return SupportedCurrency.USD
}

export const selectBtcExchangeRate = (s: CommonState) => {
    const selectedFiatCurrency = selectCurrency(s)

    let exchangeRate = s.currency.prices[selectedFiatCurrency]
    // Special case for the CFA franc which is a fixed 650x the EUR price
    if (selectedFiatCurrency === SupportedCurrency.CFA) {
        exchangeRate = s.currency.prices[SupportedCurrency.EUR] * 650
    }

    return exchangeRate
}
