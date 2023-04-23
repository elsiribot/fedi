import type { AnyAction } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'

import { FedimintBridge } from '../utils/fedimint'
import { chatSlice } from './chat'
import { currencySlice, watchPrices } from './currency'
import { environmentSlice } from './environment'
import { federationSlice } from './federation'
import { updateFederation } from './federation'
import { toastSlice } from './toast'

export * from './chat'
export * from './currency'
export * from './environment'
export * from './federation'
export * from './toast'

export const commonReducers = {
    chat: chatSlice.reducer,
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
    fedimint: FedimintBridge,
) {
    // Immediately start watching BTC/USD prices
    dispatch(watchPrices())

    // Update federation on bridge events
    fedimint.addListener('federation', event => {
        dispatch(updateFederation(event))
    })
}
