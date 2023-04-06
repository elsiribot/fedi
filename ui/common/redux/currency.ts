import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { CommonState } from '.'

/*** Initial State ***/

const initialState = {
    btcUsdPrice: 0,
    socketErrors: 0,
}

export type CurrencyState = typeof initialState

/*** Slice definition ***/

export const currencySlice = createSlice({
    name: 'currency',
    initialState,
    reducers: {
        updateBtcUsdPrice: (state, action: PayloadAction<number>) => {
            state.btcUsdPrice = action.payload
        },
        incrementSocketErrors: state => {
            state.socketErrors = state.socketErrors + 1
        },
        resetCurrencyState: state => {
            state.btcUsdPrice = 0
            state.socketErrors = 0
        },
    },
})

/*** Basic actions ***/

export const { updateBtcUsdPrice, resetCurrencyState } = currencySlice.actions

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

        socket.onopen = () => {
            socket.send(
                JSON.stringify({
                    event: 'subscribe',
                    channel: 'ticker',
                    symbol: 'tBTCUSD',
                }),
            )
        }

        socket.onmessage = (message: any) => {
            const parsedData = JSON.parse(message.data)
            if (parsedData.length === 2 && parsedData[1].length === 10) {
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                dispatch(updateBtcUsdPrice(updatedPrice))
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
