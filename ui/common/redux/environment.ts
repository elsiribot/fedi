import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { i18n } from 'i18next'

import { CommonState } from '.'

/*** Initial State ***/

const initialState = {
    developerMode: false,
    language: null as string | null,
}

export type EnvironmentState = typeof initialState

/*** Slice definition ***/

export const environmentSlice = createSlice({
    name: 'environment',
    initialState,
    reducers: {
        setDeveloperMode(state, action: PayloadAction<boolean>) {
            state.developerMode = action.payload
        },
    },
    extraReducers: builder => {
        builder.addCase(changeLanguage.fulfilled, (state, action) => {
            state.language = action.meta.arg.language
        })
    },
})

/*** Basic actions ***/

export const { setDeveloperMode } = environmentSlice.actions

/*** Async thunk actions ***/

export const changeLanguage = createAsyncThunk<
    void,
    { language: string; i18n: i18n }
>('environment/changeLanguage', ({ language, i18n }) => {
    i18n.changeLanguage(language)
})

/*** Selectors ***/

export const selectDeveloperMode = (s: CommonState) =>
    s.environment.developerMode

export const selectLanguage = (s: CommonState) => s.environment.language
