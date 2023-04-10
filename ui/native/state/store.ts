import { configureStore } from '@reduxjs/toolkit'

import { commonReducers, initializeCommonStore } from '@fedi/common/redux'
import { updateFederation } from '@fedi/common/redux/federation'

import { BridgeEventEmitter } from '../bridge'

export const store = configureStore({
    reducer: {
        ...commonReducers,
    },
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function initializeNativeStore() {
    // Common initialization behavior
    initializeCommonStore(store.dispatch)

    // Update federations on bridge event
    const emitter = new BridgeEventEmitter()
    emitter.onFederationUpdate(event => {
        // Prevents a state update on the off-chance we get an event
        // before the selectedFederation state is initialized
        if (store.getState().federation.activeFederationId == null) return
        store.dispatch(updateFederation(event))
    })
}
