import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState, completeSocialRecovery } from '.'
import { SocialRecoveryEvent } from '../types'
import { FedimintBridge } from '../utils/fedimint'

/*** Initial State ***/

const initialState = {
    hasCheckedForSocialRecovery: false,
    socialRecoveryId: null as string | null,
    socialRecoveryState: null as SocialRecoveryEvent | null,
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
    },
    extraReducers: builder => {
        builder.addCase(fetchSocialRecovery.fulfilled, (state, action) => {
            state.hasCheckedForSocialRecovery = true
            if (action.payload) {
                state.socialRecoveryId = action.payload.id
                state.socialRecoveryState = action.payload.state
            } else {
                state.socialRecoveryId = null
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
            state.socialRecoveryId = null
            state.socialRecoveryState = null
        })

        builder.addCase(cancelSocialRecovery.fulfilled, state => {
            state.socialRecoveryId = null
            state.socialRecoveryState = null
        })
    },
})

/*** Basic actions ***/

export const { setSocialRecoveryState } = recoverySlice.actions

/*** Async thunk actions ***/

export const fetchSocialRecovery = createAsyncThunk<
    { id: string; state: SocialRecoveryEvent } | void,
    FedimintBridge
>('recovery/fetchSocialRecovery', async fedimint => {
    const qr = await fedimint.recoveryQr()
    if (!qr) return
    const state = await fedimint.socialRecoveryApprovals()
    return { id: qr.recoveryId, state }
})

export const refreshSocialRecoveryState = createAsyncThunk<
    SocialRecoveryEvent,
    FedimintBridge
>('recovery/fetchSocialRecoveryState', async fedimint => {
    return fedimint.socialRecoveryApprovals()
})

// TODO: Federation has same action?
// export const completeSocialRecovery = createAsyncThunk<
//     void,
//     { fedimint: FedimintBridge }
// >('recovery/completeSocialRecovery', async ({ fedimint }) => {
//     await fedimint.completeSocialRecovery()
// })

export const cancelSocialRecovery = createAsyncThunk<void, FedimintBridge>(
    'recovery/cancelSocialRecovery',
    async fedimint => {
        await fedimint.cancelSocialRecovery()
    },
)

/*** Selectors ***/

export const selectHasCheckedForSocialRecovery = (s: CommonState) =>
    s.recovery.hasCheckedForSocialRecovery

export const selectSocialRecoveryId = (s: CommonState) =>
    s.recovery.socialRecoveryId

export const selectSocialRecoveryState = (s: CommonState) =>
    s.recovery.socialRecoveryState
