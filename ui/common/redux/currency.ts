import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

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

/*** Async thunk actions ***/

/**
 * Opens a socket to continuously monitor prices. Will automatically attempt
 * retries if the connection is lost.
 */
export const watchPrices = createAsyncThunk<void, void, { state: CommonState }>(
    'currency/watchPrices',
    async (_, { dispatch, getState }) => {
        // See docs at https://docs.bitfinex.com/docs/ws-general
        const socket = new WebSocket('wss://api-pub.bitfinex.com/ws/2')
        const priceChannels: { [channelId: number]: string } = {}

        socket.onopen = () => {
            // Subscribe to USD price
            socket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCUSD',
                }),
            )
            // Subscribe to EUR price
            socket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCEUR',
                }),
            )
        }

        socket.onmessage = (message: MessageEvent) => {
            const parsedData = JSON.parse(message.data)
            // This event is received once provides the channel ID + currency pair
            if (parsedData.event === 'subscribed') {
                const channelId: number = parsedData.chanId as number
                // Keep a map of channel IDs + currencies
                priceChannels[channelId] = parsedData.pair
            }
            // This event is recieved periodically and are sent as one of
            // these two types:
            // [number, string] - [11111, "hb"]
            // [number, number[]] - [11111, [1,2,3,4,5,6,7,8,9,10]]
            if (
                parsedData[0] &&
                priceChannels[parsedData[0]] &&
                Array.isArray(parsedData[1])
            ) {
                // Find the price data if it is the latter type
                const channelId = parsedData[0]
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                // Check the map to figure out which currency price to update
                switch (priceChannels[channelId]) {
                    case 'BTCUSD':
                        dispatch(
                            updateBtcFiatPrice({
                                currency: SupportedCurrency.USD,
                                price: updatedPrice,
                            }),
                        )
                        break
                    case 'BTCEUR':
                        dispatch(
                            updateBtcFiatPrice({
                                currency: SupportedCurrency.EUR,
                                price: updatedPrice,
                            }),
                        )
                        break
                    default:
                }
            }
        }

        // Re-try connection on closing, with a backoff.
        socket.onclose = () => {
            const { socketErrors } = getState().currency
            setTimeout(() => {
                dispatch(currencySlice.actions.incrementSocketErrors())
                dispatch(watchPrices())
            }, 1000 * socketErrors)
        }
    },
)

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
    // Special case for the CFA franc which is a fixed 650x the EUR price
    if (selectedFiatCurrency === SupportedCurrency.CFA) {
        exchangeRate = s.currency.prices[SupportedCurrency.EUR] * 650
    }
    // Special case for CZK which is a fixed 23.5x the EUR price
    if (selectedFiatCurrency === SupportedCurrency.CZK) {
        exchangeRate = s.currency.prices[SupportedCurrency.EUR] * 23.5
    }
    // Special case for Togo farmers using CFA, where a metadata override
    // provides the exchange rate directly
    if (metadata) {
        const federationFixedExchangeRate =
            getFederationFixedExchangeRate(metadata)
        if (federationFixedExchangeRate) {
            exchangeRate = federationFixedExchangeRate
        }
    }

    return exchangeRate
}
