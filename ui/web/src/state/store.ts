import { combineReducers, configureStore } from '@reduxjs/toolkit'

import {
    commonMiddleware,
    commonReducers,
    initializeCommonStore,
    selectLanguage,
} from '@fedi/common/redux'

import { fedimint } from '../lib/bridge'
import i18n, { detectLanguage } from '../localization/i18n'

const reducer = combineReducers({ ...commonReducers })
export const store = configureStore({
    middleware: commonMiddleware,
    reducer,
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

const asyncLocalStorage = {
    getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
    setItem: (key: string, item: string) =>
        Promise.resolve(localStorage.setItem(key, item)),
    removeItem: (key: string) => Promise.resolve(localStorage.removeItem(key)),
}

export function initializeWebStore() {
    // Common initialization behavior
    initializeCommonStore(store.dispatch, fedimint, asyncLocalStorage)

    // Initialize i18n, change language on store updates
    const initialLanguage = selectLanguage(store.getState())
    if (initialLanguage) {
        i18n.changeLanguage(initialLanguage)
    } else {
        detectLanguage().then(detectedLanguage => {
            i18n.changeLanguage(detectedLanguage)
        })
    }
}

// Handle hot-reloading reducers.
if (process.env.NODE_ENV !== 'production' && (module as any)?.hot) {
    ;(module as any).hot.accept('@fedi/common/redux', () =>
        store.replaceReducer(reducer),
    )
}
