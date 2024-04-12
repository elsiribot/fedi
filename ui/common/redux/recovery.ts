import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState, refreshFederations } from '.'
import { SeedWords, SocialRecoveryEvent } from '../types'
import { RpcRegisteredDevice } from '../types/bindings'
import { FedimintBridge } from '../utils/fedimint'

/*** Initial State ***/

const initialState = {
    hasCheckedForSocialRecovery: false,
    socialRecoveryQr: null as string | null,
    socialRecoveryState: null as SocialRecoveryEvent | null,
    registeredDevices: [] as RpcRegisteredDevice[],
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

        builder.addCase(recoverFromMnemonic.fulfilled, (state, action) => {
            state.registeredDevices = action.payload
        })
    },
})

/*** Basic actions ***/

export const { setSocialRecoveryState } = recoverySlice.actions

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

export const recoverFromMnemonic = createAsyncThunk<
    RpcRegisteredDevice[],
    { fedimint: FedimintBridge; mnemonic: SeedWords },
    { state: CommonState }
>('recovery/recoverFromMnemonic', async ({ fedimint, mnemonic }) => {
    return fedimint.recoverFromMnemonic(mnemonic)
})

/*** Selectors ***/

export const selectHasCheckedForSocialRecovery = (s: CommonState) =>
    s.recovery.hasCheckedForSocialRecovery

export const selectSocialRecoveryQr = (s: CommonState) =>
    s.recovery.socialRecoveryQr

export const selectSocialRecoveryState = (s: CommonState) =>
    s.recovery.socialRecoveryState

export const selectRegisteredDevices = (s: CommonState) =>
    s.recovery.registeredDevices
