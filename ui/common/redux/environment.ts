import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState } from '.'

/*** Initial State ***/

const initialState = {
    developerMode: false,
}

export type EnvironmentState = typeof initialState

/*** Slice definition ***/

export const environmentSlice = createSlice({
    name: 'environment',
    initialState,
    reducers: {
        setDeveloperMode: (state, action: PayloadAction<boolean>) => {
            state.developerMode = action.payload
        },
    },
})

/*** Basic actions ***/

export const { setDeveloperMode } = environmentSlice.actions

/*** Selectors ***/

export const selectDeveloperMode = (s: CommonState) =>
    s.environment.developerMode
