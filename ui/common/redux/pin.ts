import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState } from '.'
import { loadFromStorage } from './storage'

/*** Initial State ***/

const initialState: PinState = {
    digits: null,
    protectedFeatures: {
        app: true,
    },
    unlockedFeatures: {
        app: false,
    },
    isRecoveringBeforePin: false,
}

export interface ProtectedFeatures {
    app: boolean
}

export type PinState = {
    digits: Array<number> | null
    protectedFeatures: ProtectedFeatures
    unlockedFeatures: ProtectedFeatures
    isRecoveringBeforePin: boolean
}

/*** Slice definition ***/

export const pinSlice = createSlice({
    name: 'nux',
    initialState,
    reducers: {
        setPin(state, action: PayloadAction<PinState['digits']>) {
            state.digits = action.payload
        },
        setFeatureUnlocked(
            state,
            action: PayloadAction<{
                key: keyof PinState['unlockedFeatures']
                unlocked: boolean
            }>,
        ) {
            state.unlockedFeatures[action.payload.key] = action.payload.unlocked
        },
        setProtectedFeature(
            state,
            action: PayloadAction<{
                key: keyof PinState['protectedFeatures']
                enabled: boolean
            }>,
        ) {
            state.protectedFeatures[action.payload.key] = action.payload.enabled
        },
        setIsRecoveringBeforePin(state, action: PayloadAction<boolean>) {
            state.isRecoveringBeforePin = action.payload
        },
    },
    extraReducers: builder => {
        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return

            if (action.payload.pinDigits) {
                state.digits = action.payload.pinDigits
            }

            if (action.payload.protectedFeatures) {
                const { protectedFeatures } = action.payload
                const actions = {
                    ...state.protectedFeatures,
                }
                Object.entries(protectedFeatures).forEach(([key, value]) => {
                    if (
                        key in state.protectedFeatures &&
                        typeof value !== 'undefined'
                    ) {
                        actions[key as keyof PinState['protectedFeatures']] =
                            value
                    }
                })
                state.protectedFeatures = actions
            }
        })
    },
})

/*** Basic actions ***/

export const { setPin, setIsRecoveringBeforePin, setFeatureUnlocked, setProtectedFeature } =
    pinSlice.actions

/*** Selectors ***/

export const selectPinDigits = (s: CommonState) => s.pin.digits

export const selectIsFeatureUnlocked = (
    s: CommonState,
    feature: keyof ProtectedFeatures,
) => s.pin.unlockedFeatures[feature]

export const selectProtectedFeatures = (s: CommonState) =>
    s.pin.protectedFeatures

export const selectIsRecoveringBeforePin = (s: CommonState) =>
    s.pin.isRecoveringBeforePin

export const selectHasSetPin = (s: CommonState) => s.pin.digits !== null
