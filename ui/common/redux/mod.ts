import { PayloadAction, createSelector, createSlice } from '@reduxjs/toolkit'
import omit from 'lodash/omit'

import { CommonState } from '.'
import { FediMod } from '../types'
import {
    GLOBAL_FEDERATION_ID,
    getFederationFediMods,
} from '../utils/FederationUtils'
import { loadFromStorage } from './storage'

// using an interface here to explicitly define "visibility" instead of an ambigious bool
export interface ModVisibility {
    isHidden: boolean
}

const initialState = {
    customGlobal: {} as Record<FediMod['id'], FediMod>,
    customVisibility: {} as Record<FediMod['id'], ModVisibility>,
    suggestedVisibility: {} as Record<FediMod['id'], ModVisibility>,
}

export type ModState = typeof initialState

export const modSlice = createSlice({
    name: 'mod',
    initialState,
    reducers: {
        addCustomGlobalMod(
            state,
            action: PayloadAction<{
                fediMod: FediMod
            }>,
        ) {
            const { fediMod } = action.payload

            state.customGlobal[fediMod.id] = fediMod
        },
        removeCustomGlobalMod(
            state,
            action: PayloadAction<{ modId: FediMod['id'] }>,
        ) {
            const { modId } = action.payload

            // Clean up mod
            if (state.customGlobal[modId]) {
                state.customGlobal = omit(state.customGlobal, modId)
            }
        },
        setCustomGlobalModVisibility(
            state,
            action: PayloadAction<{
                modId: FediMod['id']
                isHidden: boolean
            }>,
        ) {
            const { modId, isHidden } = action.payload

            state.customVisibility[modId] = { isHidden }
        },
        setSuggestedGlobalModVisibility(
            state,
            action: PayloadAction<{
                modId: FediMod['id']
                isHidden: boolean
            }>,
        ) {
            const { modId, isHidden } = action.payload

            state.suggestedVisibility[modId] = { isHidden }
        },
    },
    extraReducers: builder => {
        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return

            state.customGlobal = action.payload.customGlobalMods || {}
            state.customVisibility =
                action.payload.customGlobalModVisibility || {}
            state.suggestedVisibility =
                action.payload.suggestedGlobalModVisibility || {}
        })
    },
})

export const {
    addCustomGlobalMod,
    removeCustomGlobalMod,
    setCustomGlobalModVisibility,
    setSuggestedGlobalModVisibility,
} = modSlice.actions

export const selectGlobalCustomMods = (s: CommonState) =>
    Object.values(s.mod.customGlobal)

export const selectVisibleCustomMods = createSelector(
    (s: CommonState) => s.mod.customVisibility,
    selectGlobalCustomMods,
    (customVisibility, mods) =>
        mods.filter(mod => {
            const visibility = customVisibility[mod.id]
            if (!visibility) {
                return true
            }

            return visibility.isHidden
        }),
)

export const selectGlobalSuggestedMods = createSelector(
    (s: CommonState) => s.federation.globalFederation,
    federation => {
        if (!federation) return []

        return getFederationFediMods(federation.meta)
    },
)

export const selectGlobalFederationFediMods = createSelector(
    selectGlobalSuggestedMods,
    (s: CommonState) => s.federation.customFediMods[GLOBAL_FEDERATION_ID],
    (suggestedMods, customMods = []) => {
        return [...suggestedMods, ...customMods]
    },
)

export const selectVisibleGlobalSuggestedMods = createSelector(
    (s: CommonState) => s.mod.suggestedVisibility,
    selectGlobalFederationFediMods,
    (suggestedVisibility, mods) => {
        return mods.filter(mod => {
            const visibility = suggestedVisibility[mod.id]
            if (!visibility) {
                return true
            }

            return !visibility.isHidden
        })
    },
)

export const selectVisibleGlobalMods = createSelector(
    selectVisibleGlobalSuggestedMods,
    selectVisibleCustomMods,
    (suggested, custom) => [...suggested, ...custom],
)
