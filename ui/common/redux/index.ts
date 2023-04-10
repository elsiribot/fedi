import type { AnyAction } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'

import { currencySlice, watchPrices } from './currency'
import { federationSlice } from './federation'

export * from './currency'

export const commonReducers = {
    currency: currencySlice.reducer,
    federation: federationSlice.reducer,
}

type CommonReducers = typeof commonReducers
export type CommonState = {
    [key in keyof CommonReducers]: ReturnType<CommonReducers[key]>
}

/**
 * Sets up any initial redux behavior that is consistent across all platforms.
 */
export function initializeCommonStore(
    dispatch: ThunkDispatch<CommonState, unknown, AnyAction>,
) {
    // Immediately start watching BTC/USD prices
    dispatch(watchPrices())
}
