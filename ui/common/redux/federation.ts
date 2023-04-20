import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState } from '.'
import type {
    Federation,
    FederationCredentials,
    FederationEvent,
    Guardian,
} from '../types'
import type { FedimintRpc } from '../utils/fedimint'

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
            state.federations = action.payload.map(f => ({
                ...f,
                // TODO: REMOVE ME! This is only here because old fedimints didn't have 'id' set
                id: f.id || f.name,
            }))
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
    FedimintRpc,
    { state: CommonState }
>('federation/refreshFederations', async (fedimint, { dispatch }) => {
    const federations = await fedimint.listFederations()
    dispatch(setFederations(federations))
    return federations
})

export const joinFederation = createAsyncThunk<
    Federation,
    { fedimint: FedimintRpc; code: string },
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

/*** Selectors ***/

export const selectActiveFederation = (s: CommonState) => {
    const { federations, activeFederationId } = s.federation
    return activeFederationId
        ? federations.find(f => f.id === activeFederationId)
        : federations[0]
}

export const selectFederations = (s: CommonState) => s.federation.federations
