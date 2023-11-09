import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureStore } from '@reduxjs/toolkit'
import { AppState as RNAppState } from 'react-native'

import {
    commonMiddleware,
    commonReducers,
    fetchCurrencyPrices,
    initializeCommonStore,
} from '@fedi/common/redux'
import { makeLog } from '@fedi/common/utils/log'
import { checkForLegacyChatMigrations } from '@fedi/native/utils/migration'

import { fedimint } from '../bridge'

const log = makeLog('native/state/store')

export const store = configureStore({
    middleware: commonMiddleware,
    reducer: {
        ...commonReducers,
    },
})

export type AppStore = typeof store
export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export function initializeNativeStore() {
    // Common initialization behavior
    const unsubscribe = initializeCommonStore(
        store.dispatch,
        fedimint,
        AsyncStorage,
    )

    // Whenever the app is brought back into the foreground, refresh prices.
    const changeSubscription = RNAppState.addEventListener('change', state => {
        if (state === 'active') {
            log.debug('App returned to foreground, refreshing prices...')
            store.dispatch(fetchCurrencyPrices())
        }
    })

    // DELETEME: This logic is only needed to check for legacy chat data and
    // migrate it to the reduxified chat data structure. We can remove this
    // after a long enough time has passed since v1.11 where legacy chat data
    // was used. As of v1.12.1+ only redux is used for chat state management
    const storageMonitor = setInterval(() => {
        const state = store.getState()
        if (
            state.storage.hasLoaded &&
            state.federation.federations.length > 0
        ) {
            clearInterval(storageMonitor)
            checkForLegacyChatMigrations(store)
        }
    }, 1000)

    return () => {
        unsubscribe()
        changeSubscription.remove()
        clearInterval(storageMonitor)
    }
}
