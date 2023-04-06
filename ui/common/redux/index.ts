import { currencySlice, watchPrices } from './currency'
import type { ThunkDispatch } from 'redux-thunk'
import type { AnyAction } from 'redux'

export * from './currency'

export const commonReducers = {
    currency: currencySlice.reducer,
}

type CommonReducers = typeof commonReducers
export type CommonState = {
    [key in keyof CommonReducers]: ReturnType<CommonReducers[key]>
}

/**
 * Sets up any initial redux behavior that is consistent across all platforms.
 */
export function initializeStore(
    dispatch: ThunkDispatch<CommonState, unknown, AnyAction>,
) {
    // Immediately start watching BTC/USD prices
    dispatch(watchPrices())
}
