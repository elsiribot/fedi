import {
    createAsyncThunk,
    createSelector,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit'

import { authenticateChat, CommonState } from '.'
import type { Federation, FederationEvent, Guardian, SeedWords } from '../types'
import type { FedimintBridge } from '../utils/fedimint'
import { loadFromStorage } from './storage'

/*** Initial State ***/

const initialState = {
    federations: [] as Federation[],
    activeFederationId: null as string | null,
    authenticatedGuardian: null as Guardian | null,
}

export type FederationState = typeof initialState

/*** Slice definition ***/

export const federationSlice = createSlice({
    name: 'federation',
    initialState,
    reducers: {
        setFederations(state, action: PayloadAction<Federation[]>) {
            state.federations = action.payload
        },
        updateFederation(state, action: PayloadAction<FederationEvent>) {
            state.federations = state.federations.map(federation =>
                action.payload.id === federation.id
                    ? { ...federation, ...action.payload }
                    : federation,
            )
        },
        setActiveFederationId(state, action: PayloadAction<string | null>) {
            state.activeFederationId = action.payload
        },
        changeAuthenticatedGuardian(
            state,
            action: PayloadAction<Guardian | null>,
        ) {
            state.authenticatedGuardian = action.payload
        },
        resetFederationsState() {
            return { ...initialState }
        },
    },
    extraReducers: builder => {
        builder.addCase(leaveFederation.fulfilled, (state, action) => {
            const { federationId } = action.meta.arg
            state.federations = state.federations.filter(
                fed => fed.id !== federationId,
            )
            if (state.activeFederationId === federationId) {
                state.activeFederationId = state.federations[0]?.id
            }
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.activeFederationId = action.payload.activeFederationId
        })
    },
})

/*** Basic actions ***/

export const {
    setFederations,
    updateFederation,
    setActiveFederationId,
    changeAuthenticatedGuardian,
    resetFederationsState,
} = federationSlice.actions

/*** Async thunk actions */

export const refreshFederations = createAsyncThunk<
    Federation[],
    FedimintBridge,
    { state: CommonState }
>('federation/refreshFederations', async (fedimint, { dispatch }) => {
    const federations = await fedimint.listFederations()
    dispatch(setFederations(federations))
    return federations
})

export const joinFederation = createAsyncThunk<
    Federation,
    { fedimint: FedimintBridge; code: string },
    { state: CommonState }
>('federation/joinFederation', async ({ fedimint, code }, { dispatch }) => {
    const federation = await fedimint.joinFederation(code)
    const federations = await fedimint.listFederations()
    if (federations.length > 0) {
        dispatch(setFederations(federations))
        dispatch(setActiveFederationId(federation.id))
    } else {
        throw new Error('Bridge reported no federations')
    }
    return federation
})

export const leaveFederation = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string }
>('federation/leaveFederation', async ({ fedimint, federationId }) => {
    await fedimint.leaveFederation(federationId)
})

export const recoverFromMnemonic = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string; mnemonic: SeedWords },
    { state: CommonState }
>(
    'federation/recoverFromMnemonic',
    async ({ fedimint, federationId, mnemonic }, { dispatch }) => {
        const username = await fedimint.recoverFromMnemonic(
            mnemonic,
            federationId,
        )
        // Kick off chat authentication and refresh, but don't reject
        // if either fail. The new mnemonic has been written to bridge
        // so it's fulfilled either way.
        if (username !== null) {
            await dispatch(
                authenticateChat({ fedimint, federationId, username }),
            )
        }
        await dispatch(refreshFederations(fedimint))
    },
)

/*** Selectors ***/

export const selectActiveFederation = (s: CommonState) => {
    const { federations, activeFederationId } = s.federation
    return activeFederationId
        ? federations.find(f => f.id === activeFederationId)
        : federations[0]
}

export const selectFederations = (s: CommonState) => s.federation.federations

export const selectFederationMetadata = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.meta : {}
    },
)
