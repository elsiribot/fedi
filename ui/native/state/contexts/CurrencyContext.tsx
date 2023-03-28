import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useReducer,
} from 'react'
import { BITFINEX_BTCUSD_WEBSOCKET_URL } from '../../constants'

// Define the structure of this Context and its initial state
interface CurrencyContextState {
    btcUsdPrice: number
}
const initialState: CurrencyContextState = {
    btcUsdPrice: 0,
}
type AppState = typeof initialState

// Define actions that can change the state within this Context
enum ActionType {
    UPDATE_BTC_USD_PRICE = 'UPDATE_BTC_USD_PRICE',
    RESET_CURRENCY_STATE = 'RESET_CURRENCY_STATE',
}
interface Action {
    type: ActionType
    payload?: any
}

// Wrap with state and dispatch fields and create the Context
type BaseContext = {
    state: CurrencyContextState
    dispatch: React.Dispatch<Action>
}
export const CurrencyContext = createContext({} as BaseContext)

// Export action creators as convenience functions to trigger state changes
export function updateBtcUsdPrice(price: number): Action {
    return {
        type: ActionType.UPDATE_BTC_USD_PRICE,
        payload: price,
    }
}
export function resetCurrencyState(): Action {
    return {
        type: ActionType.RESET_CURRENCY_STATE,
    }
}

// Implement the reducer with actions and state changes
export function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case ActionType.UPDATE_BTC_USD_PRICE:
            return {
                ...state,
                btcUsdPrice: action.payload,
            }
        case ActionType.RESET_CURRENCY_STATE:
            return { ...initialState }
        default:
            return state
    }
}

function CurrencyProvider(props: React.PropsWithChildren<{}>) {
    const [state, dispatch] = useReducer<React.Reducer<AppState, Action>>(
        reducer,
        initialState,
    )

    // useMemo makes sure the Provider only re-renders when
    // there is a state change
    const providerValue = useMemo(
        () => ({ state, dispatch }),
        [state, dispatch],
    )

    useEffect(() => {
        // See https://docs.bitfinex.com/reference/ws-public-ticker
        // for API specs of this price ticker websocket
        const socket = new WebSocket(BITFINEX_BTCUSD_WEBSOCKET_URL)

        socket.onmessage = (message: any) => {
            const parsedData = JSON.parse(message.data)
            if (parsedData.length === 2 && parsedData[1].length === 10) {
                const priceData = parsedData[1]
                const updatedPrice = priceData[6]
                dispatch(updateBtcUsdPrice(updatedPrice))
            }
        }

        let priceRequest = JSON.stringify({
            event: 'subscribe',
            channel: 'ticker',
            symbol: 'tBTCUSD',
        })
        socket.onopen = () => socket.send(priceRequest)
    }, [])

    return <CurrencyContext.Provider value={providerValue} {...props} />
}

function useCurrencyContext() {
    return useContext(CurrencyContext)
}

export { CurrencyProvider, useCurrencyContext }
