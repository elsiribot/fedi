import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { CommonState } from '.'
import type {
    Federation,
    FederationCredentials,
    FederationEvent,
    Guardian,
} from '../types'

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
                action.payload.name === federation.name
                    ? { ...federation, ...action.payload }
                    : federation,
            )
        },
        updateFederationCredentials(
            state,
            action: PayloadAction<FederationCredentials>,
        ) {
            state.federations = state.federations.map(federation =>
                federation.name === state.activeFederationId
                    ? { ...federation, ...action.payload }
                    : federation,
            )
        },
        resetFederationCredentials(state) {
            state.federations = state.federations.map(federation =>
                federation.name === state.activeFederationId
                    ? {
                          ...federation,
                          username: null,
                          password: null,
                          keypairSeed: null,
                      }
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
    updateFederationCredentials,
    resetFederationCredentials,
    setActiveFederationId,
    changeAuthenticatedGuardian,
    resetFederationsState,
} = federationSlice.actions

/*** Selectors ***/

export const selectActiveFederation = (s: CommonState) =>
    s.federation.federations.find(
        f => f.name === s.federation.activeFederationId,
    )
