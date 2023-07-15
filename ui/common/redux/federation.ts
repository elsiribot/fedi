import {
    createAsyncThunk,
    createSelector,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit'

import { authenticateChat, CommonState } from '.'
import type {
    Federation,
    FederationEvent,
    Guardian,
    MSats,
    Sats,
    SeedWords,
    FediMod,
} from '../types'
import amountUtils from '../utils/AmountUtils'
import {
    fetchMetadataFromExternalUrl,
    getFederationGroupChats,
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
    getFederationFediMods,
} from '../utils/FederationUtils'
import type { FedimintBridge } from '../utils/fedimint'
import { loadFromStorage } from './storage'

/*** Initial State ***/

const initialState = {
    federations: [] as Federation[],
    activeFederationId: null as string | null,
    authenticatedGuardian: null as Guardian | null,
    customFediMods: {} as Record<Federation['id'], FediMod[] | undefined>,
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
                    ? {
                          ...federation,
                          ...action.payload,
                          // TODO: this is needed to make sure metadata from bridge doesn't
                          // overwrite externally fetched metadata, but still should
                          // be refactored because the meta_external_url will never update
                          // if it does need to be changed and fetch from somewhere else
                          meta: {
                              ...action.payload.meta,
                              ...federation.meta,
                          },
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
        addCustomFediMod(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                fediMod: FediMod
            }>,
        ) {
            const { federationId, fediMod } = action.payload
            const fediMods = state.customFediMods[federationId] || []
            state.customFediMods[federationId] = [...fediMods, fediMod]
        },
        removeCustomFediMod(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                fediModId: FediMod['id']
            }>,
        ) {
            const { federationId, fediModId } = action.payload
            const fediMods = state.customFediMods[federationId] || []
            state.customFediMods[federationId] = fediMods.filter(
                f => f.id !== fediModId,
            )
        },
    },
    extraReducers: builder => {
        builder.addCase(leaveFederation.fulfilled, (state, action) => {
            const { federationId } = action.meta.arg
            state.federations = state.federations.filter(
                fed => fed.id !== federationId,
            )
            if (state.federations.length === 0) {
                state.activeFederationId = null
            } else if (state.activeFederationId === federationId) {
                state.activeFederationId = state.federations[0]?.id
            }
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.activeFederationId = action.payload.activeFederationId
            state.authenticatedGuardian = action.payload.authenticatedGuardian
            state.customFediMods = action.payload.customFediMods || {}
        })
    },
})

/*** Basic actions ***/

export const {
    setFederations,
    updateFederation,
    setActiveFederationId,
    changeAuthenticatedGuardian,
    addCustomFediMod,
    removeCustomFediMod,
} = federationSlice.actions

/*** Async thunk actions */

export const refreshFederationsMetadata = createAsyncThunk<
    void,
    void,
    { state: CommonState }
>(
    'federation/refreshFederationsMetadata',
    async (_, { getState, dispatch }) => {
        const federations = getState().federation.federations
        console.info('refreshFederationsMetadata')
        const federationsWithMeta = await Promise.all(
            federations.map(fetchMetadataFromExternalUrl),
        )
        dispatch(setFederations(federationsWithMeta))
    },
)

export const refreshFederations = createAsyncThunk<
    Federation[],
    FedimintBridge,
    { state: CommonState }
>('federation/refreshFederations', async (fedimint, { dispatch }) => {
    const federations = await fedimint.listFederations()
    console.info('refreshFederations', 'federations', federations)
    const federationsWithMeta = await Promise.all(
        federations.map(fetchMetadataFromExternalUrl),
    )
    dispatch(setFederations(federationsWithMeta))
    return federations
})

export const joinFederation = createAsyncThunk<
    Federation,
    { fedimint: FedimintBridge; code: string },
    { state: CommonState }
>(
    'federation/joinFederation',
    async ({ fedimint, code }, { dispatch, getState }) => {
        const federation = await fedimint.joinFederation(code)

        const existingFederations = getState().federation.federations
        if (existingFederations.find(f => f.id === federation.id)) {
            throw new Error('errors.you-have-already-joined')
        }

        const federations = await fedimint.listFederations()
        if (federations.length > 0) {
            const federationsWithMeta = await Promise.all(
                federations.map(fetchMetadataFromExternalUrl),
            )
            dispatch(setFederations(federationsWithMeta))
            dispatch(setActiveFederationId(federation.id))
        } else {
            throw new Error('Bridge reported no federations')
        }
        return federation
    },
)

export const leaveFederation = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string }
>('federation/leaveFederation', async ({ fedimint, federationId }) => {
    await fedimint.leaveFederation(federationId)
})

export const completeSocialRecovery = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string },
    { state: CommonState }
>(
    'federation/completeSocialRecovery',
    async ({ fedimint, federationId }, { dispatch }) => {
        const username = await fedimint.completeSocialRecovery(federationId)
        // Kick off chat authentication and refresh, but don't reject
        // if either fail. The new mnemonic has been written to bridge
        // so it's fulfilled either way.
        if (username !== null) {
            await dispatch(
                authenticateChat({
                    fedimint,
                    federationId,
                    username,
                    forceCredentialRefresh: true,
                }),
            )
        }
        await dispatch(refreshFederations(fedimint))
    },
)

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
                authenticateChat({
                    fedimint,
                    federationId,
                    username,
                    forceCredentialRefresh: true,
                }),
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

export const selectFederationBalance = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.balance : 0
    },
)

export const selectFederationCustomFediMods = (s: CommonState) => {
    const activeFederation = selectActiveFederation(s)
    return activeFederation
        ? s.federation.customFediMods[activeFederation?.id] || []
        : []
}

// For now we set a safe default of 200K sats maximum unless otherwise
// specified by the federation feature flags. At some points we probably
// can remove this hard-coded value altogether
const MAX_INVOICE_AMOUNT_SATS = 200000 as Sats
const MAX_BALANCE_AMOUNT_SATS = 200000 as Sats

export const selectMaxReceiveAmount = createSelector(
    selectFederationMetadata,
    metadata => {
        const maxInvoiceMsats =
            metadata && getFederationMaxInvoiceMsats(metadata)

        if (maxInvoiceMsats === 0) return 0 as Sats

        return maxInvoiceMsats
            ? amountUtils.msatToSat(maxInvoiceMsats)
            : MAX_INVOICE_AMOUNT_SATS
    },
)

export const selectMaxBalanceAmount = createSelector(
    selectFederationMetadata,
    metadata => {
        const maxBalanceMsats =
            metadata && getFederationMaxBalanceMsats(metadata)

        if (maxBalanceMsats === 0) return 0 as Sats

        return maxBalanceMsats
            ? amountUtils.msatToSat(maxBalanceMsats)
            : MAX_BALANCE_AMOUNT_SATS
    },
)

export const selectReceivesDisabled = createSelector(
    selectMaxReceiveAmount,
    selectMaxBalanceAmount,
    selectFederationBalance,
    (maxReceiveAmount, maxBalanceAmount, balance) => {
        let receivesDisabled = false
        // Disable receives if maxInvoiceMsats is set to 0
        if (maxReceiveAmount === 0) {
            receivesDisabled = true
        }
        // Disable receives if balance exceeds maxBalanceMsats
        const balanceSats = amountUtils.msatToSat(balance as MSats)
        if (balanceSats >= maxBalanceAmount) {
            receivesDisabled = true
        }

        return receivesDisabled
    },
)

export const selectFederationFediMods = createSelector(
    selectActiveFederation,
    selectFederationCustomFediMods,
    (federation, customFediMods) => {
        if (!federation) return []
        return [...getFederationFediMods(federation.meta), ...customFediMods]
    },
)

export const selectFederationGroupChats = createSelector(
    selectFederationMetadata,
    getFederationGroupChats,
)
