import type { AnyAction } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'

import { currencySlice, watchPrices } from './currency'
import { environmentSlice } from './environment'
import { federationSlice } from './federation'
import { toastSlice } from './toast'

export * from './currency'
export * from './environment'
export * from './federation'
export * from './toast'

export const commonReducers = {
    currency: currencySlice.reducer,
    environment: environmentSlice.reducer,
    federation: federationSlice.reducer,
    toast: toastSlice.reducer,
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
