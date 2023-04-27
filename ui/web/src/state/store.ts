import { configureStore } from '@reduxjs/toolkit'

import {
    commonReducers,
    initializeCommonStore,
    selectLanguage,
} from '@fedi/common/redux'

import { fedimint } from '../lib/bridge'
import i18n, { detectLanguage } from '../localization/i18n'

export const store = configureStore({
    reducer: {
        ...commonReducers,
    },
})

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function initializeWebStore() {
    // Common initialization behavior
    initializeCommonStore(store.dispatch, fedimint)

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
