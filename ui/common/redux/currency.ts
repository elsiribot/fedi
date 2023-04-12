import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState } from '.'

/*** Initial State ***/

const initialState = {
    btcUsdPrice: 0,
    btcEurPrice: 0,
    socketErrors: 0,
}

export type CurrencyState = typeof initialState

/*** Slice definition ***/

export const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        updateBtcEurPrice(state, action: PayloadAction<number>) {
            state.btcEurPrice = action.payload
        },
        updateBtcUsdPrice(state, action: PayloadAction<number>) {
            state.btcUsdPrice = action.payload
        },
        incrementSocketErrors(state) {
            state.socketErrors = state.socketErrors + 1
        },
        resetCurrencyState() {
            return { ...initialState }
        },
    },
})

/*** Basic actions ***/

export const { updateBtcEurPrice, updateBtcUsdPrice, resetCurrencyState } =
    currencySlice.actions

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
                dispatch(updateBtcUsdPrice(updatedPrice))
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
                dispatch(updateBtcEurPrice(updatedPrice))
            }
        }
    },
)
