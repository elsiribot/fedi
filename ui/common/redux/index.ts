import { createListenerMiddleware } from '@reduxjs/toolkit'
import { CurriedGetDefaultMiddleware } from '@reduxjs/toolkit/dist/getDefaultMiddleware'
import type { AnyAction } from 'redux'
import type { ThunkDispatch } from 'redux-thunk'

import { Federation, StorageApi } from '../types'
import { FedimintBridge } from '../utils/fedimint'
import { hasStorageStateChanged } from '../utils/storage'
import { chatSlice } from './chat'
import { currencySlice, watchPrices } from './currency'
import { environmentSlice } from './environment'
import { federationSlice } from './federation'
import { updateFederation } from './federation'
import { loadFromStorage, saveToStorage, storageSlice } from './storage'
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
    storage: storageSlice.reducer,
    toast: toastSlice.reducer,
}

type CommonReducers = typeof commonReducers
export type CommonState = {
    [key in keyof CommonReducers]: ReturnType<CommonReducers[key]>
}
export type CommonDispatch = ThunkDispatch<CommonState, unknown, AnyAction>

export const listenerMiddleware = createListenerMiddleware<CommonState>()
export const commonMiddleware = (
    getDefaultMiddleware: CurriedGetDefaultMiddleware<CommonState>,
) => getDefaultMiddleware().prepend(listenerMiddleware.middleware)

/**
 * Sets up any initial redux behavior that is consistent across all platforms.
 */
export function initializeCommonStore(
    dispatch: ThunkDispatch<CommonState, unknown, AnyAction>,
    fedimint: FedimintBridge,
    storage: StorageApi,
) {
    // Immediately start watching BTC/USD prices
    dispatch(watchPrices())

    // Update federation on bridge events
    fedimint.addListener('federation', event => {
        // If they have an external meta configured, exclude name and meta from update
        const federation: Partial<Federation> = { ...event }
        if (event.meta.meta_external_url) {
            delete federation.name
            delete federation.meta
        }
        dispatch(updateFederation(federation))
    })

    // Load state from local storage, then start listener that syncs to storage
    // on changes to stored state after it's been loaded.
    dispatch(loadFromStorage({ storage })).then(() => {
        listenerMiddleware.startListening({
            predicate: (_action, currentState, previousState) => {
                return hasStorageStateChanged(currentState, previousState)
            },
            effect: async (_action, listnerApi) => {
                // Cancel any pending saves
                listnerApi.cancelActiveListeners()

                // Delay saving to allow for multiple state changes to be batched
                await listnerApi.delay(100)

                // Save state to storage
                dispatch(saveToStorage({ storage }))
            },
        })
    })
}
