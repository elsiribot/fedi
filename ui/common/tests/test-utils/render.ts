import { renderHook } from '@testing-library/react'
import i18n from 'i18next'
import { useEffect, createElement } from 'react'
import { initReactI18next } from 'react-i18next'
import { Provider } from 'react-redux'

import { resources } from '@fedi/common/localization'
import { initializeCommonStore, setupStore } from '@fedi/common/redux'
import { StorageApi } from '@fedi/common/types'

import { createMockFedimintBridge } from './fedimint'

export const mockI18n = i18n.use(initReactI18next).init({
    fallbackLng: 'en',
    resources,
})

export const mockReduxProvider = (
    store: ReturnType<typeof setupStore> = setupStore(),
) => {
    const mockFedimint = createMockFedimintBridge()
    const mockStorageApi: StorageApi = {
        getItem: jest.fn(() => Promise.resolve('')),
        setItem: jest.fn(() => Promise.resolve()),
        removeItem: jest.fn(() => Promise.resolve()),
    }

    return ({ children }: { children: React.ReactNode }) => {
        useEffect(() => {
            const unsubscribe = initializeCommonStore({
                store,
                fedimint: mockFedimint,
                storage: mockStorageApi,
                i18n,
            })

            return unsubscribe
        }, [])

        return createElement(Provider, { store, children })
    }
}

export function renderHookWithState<T>(
    hook: () => T,
    store: ReturnType<typeof setupStore> = setupStore(),
) {
    return renderHook(hook, {
        wrapper: mockReduxProvider(store),
    })
}
