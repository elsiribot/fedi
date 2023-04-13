import { configureStore } from '@reduxjs/toolkit'

import { commonReducers, initializeCommonStore } from '@fedi/common/redux'

export const store = configureStore({
    reducer: {
        ...commonReducers,
    },
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function initializeWebStore() {
    // Common initialization behavior
    initializeCommonStore(store.dispatch)
}
