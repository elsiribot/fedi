import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState, refreshFederations } from '.'
import { SocialRecoveryEvent } from '../types'
import { FedimintBridge } from '../utils/fedimint'
import { loadFromStorage } from './storage'

/*** Initial State ***/

const initialState = {
    hasCheckedForSocialRecovery: false,
    socialRecoveryQr: null as string | null,
    socialRecoveryState: null as SocialRecoveryEvent | null,
    hasPerformedPersonalBackup: false,
}

export type RecoveryState = typeof initialState

/*** Slice definition ***/

export const recoverySlice = createSlice({
    name: 'recovery',
    initialState,
    reducers: {
        setSocialRecoveryState(
            state,
            action: PayloadAction<RecoveryState['socialRecoveryState']>,
        ) {
            state.socialRecoveryState = action.payload
        },
        setHasPerformedPersonalBackup(
            state,
            action: PayloadAction<RecoveryState['hasPerformedPersonalBackup']>,
        ) {
            state.hasPerformedPersonalBackup = action.payload
        },
    },
    extraReducers: builder => {
        builder.addCase(fetchSocialRecovery.fulfilled, (state, action) => {
            state.hasCheckedForSocialRecovery = true
            if (action.payload) {
                state.socialRecoveryQr = action.payload.qr
                state.socialRecoveryState = action.payload.state
            } else {
                state.socialRecoveryQr = null
                state.socialRecoveryState = null
            }
        })

        builder.addCase(
            refreshSocialRecoveryState.fulfilled,
            (state, action) => {
                state.socialRecoveryState = action.payload
            },
        )

        builder.addCase(completeSocialRecovery.fulfilled, state => {
            state.socialRecoveryQr = null
            state.socialRecoveryState = null
        })

        builder.addCase(cancelSocialRecovery.fulfilled, state => {
            state.socialRecoveryQr = null
            state.socialRecoveryState = null
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return

            if (action.payload.hasPerformedPersonalBackup) {
                state.hasPerformedPersonalBackup =
                    action.payload.hasPerformedPersonalBackup
            }
        })
    },
})

/*** Basic actions ***/

export const { setSocialRecoveryState, setHasPerformedPersonalBackup } =
    recoverySlice.actions

/*** Async thunk actions ***/

export const fetchSocialRecovery = createAsyncThunk<
    { qr: string; state: SocialRecoveryEvent } | void,
    FedimintBridge
>('recovery/fetchSocialRecovery', async fedimint => {
    const qr = await fedimint.recoveryQr()
    if (!qr) return
    const state = await fedimint.socialRecoveryApprovals()
    return { qr: JSON.stringify(qr), state }
})

export const refreshSocialRecoveryState = createAsyncThunk<
    SocialRecoveryEvent,
    FedimintBridge
>('recovery/fetchSocialRecoveryState', async fedimint => {
    return fedimint.socialRecoveryApprovals()
})

export const completeSocialRecovery = createAsyncThunk<
    void,
    { fedimint: FedimintBridge },
    { state: CommonState }
>('recovery/completeSocialRecovery', async ({ fedimint }, { dispatch }) => {
    await fedimint.completeSocialRecovery()
    await dispatch(refreshFederations(fedimint))
})

export const cancelSocialRecovery = createAsyncThunk<void, FedimintBridge>(
    'recovery/cancelSocialRecovery',
    async fedimint => {
        await fedimint.cancelSocialRecovery()
    },
)

/*** Selectors ***/

export const selectHasCheckedForSocialRecovery = (s: CommonState) =>
    s.recovery.hasCheckedForSocialRecovery

export const selectSocialRecoveryQr = (s: CommonState) =>
    s.recovery.socialRecoveryQr

export const selectSocialRecoveryState = (s: CommonState) =>
    s.recovery.socialRecoveryState

export const selectHasPerformedPersonalBackup = (s: CommonState) =>
    s.recovery.hasPerformedPersonalBackup
