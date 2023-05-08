import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureStore } from '@reduxjs/toolkit'

import {
    commonMiddleware,
    commonReducers,
    initializeCommonStore,
} from '@fedi/common/redux'

import { fedimint } from '../bridge'

export const store = configureStore({
    middleware: commonMiddleware,
    reducer: {
        ...commonReducers,
    },
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function initializeNativeStore() {
    // Common initialization behavior
    initializeCommonStore(store.dispatch, fedimint, AsyncStorage)
}
