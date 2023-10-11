import {
    createAsyncThunk,
    createSelector,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'

import { authenticateChat, CommonState } from '.'
import {
    Federation,
    Guardian,
    MSats,
    Sats,
    SeedWords,
    FediMod,
    SupportedCurrency,
} from '../types'
import amountUtils from '../utils/AmountUtils'
import {
    getFederationGroupChats,
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
    getFederationFediMods,
    fetchFederationsExternalMetadata,
} from '../utils/FederationUtils'
import type { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'
import { loadFromStorage } from './storage'

const log = makeLog('redux/federation')

/*** Initial State ***/

const initialState = {
    federations: [] as Federation[],
    activeFederationId: null as string | null,
    authenticatedGuardian: null as Guardian | null,
    externalMeta: {} as Record<
        Federation['id'],
        Federation['meta'] | undefined
    >,
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
        updateFederation(state, action: PayloadAction<Partial<Federation>>) {
            // Only update the array if there were meaningful changes to the federation
            let hasUpdates = false
            const updatedFederations = state.federations.map(federation => {
                if (action.payload.id !== federation.id) return federation

                const updatedFederation = {
                    ...federation,
                    ...action.payload,
                }
                hasUpdates = !isEqual(federation, updatedFederation)
                return updatedFederation
            })
            if (hasUpdates) {
                state.federations = updatedFederations
            }
        },
        setActiveFederationId(state, action: PayloadAction<string | null>) {
            state.activeFederationId = action.payload
        },
        updateExternalMeta(
            state,
            action: PayloadAction<FederationState['externalMeta']>,
        ) {
            state.externalMeta = {
                ...state.externalMeta,
                ...action.payload,
            }
        },
        setFederationExternalMeta(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                meta: Federation['meta'] | undefined
            }>,
        ) {
            const { federationId, meta } = action.payload
            state.externalMeta = isEqual(meta, state.externalMeta[federationId])
                ? state.externalMeta
                : { ...state.externalMeta, [federationId]: meta }
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
            // Remove from federations
            state.federations = state.federations.filter(
                fed => fed.id !== federationId,
            )
            if (state.federations.length === 0) {
                state.activeFederationId = null
            } else if (state.activeFederationId === federationId) {
                state.activeFederationId = state.federations[0]?.id
            }
            // Clean up external meta entry
            if (state.externalMeta[federationId]) {
                state.externalMeta = omit(state.externalMeta, federationId)
            }
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.activeFederationId = action.payload.activeFederationId
            state.authenticatedGuardian = action.payload.authenticatedGuardian
            state.externalMeta = action.payload.externalMeta
            state.customFediMods = action.payload.customFediMods || {}
        })
    },
})

/*** Basic actions ***/

export const {
    setFederations,
    updateFederation,
    setActiveFederationId,
    updateExternalMeta,
    setFederationExternalMeta,
    changeAuthenticatedGuardian,
    addCustomFediMod,
    removeCustomFediMod,
} = federationSlice.actions

/*** Async thunk actions */

export const refreshFederations = createAsyncThunk<
    Federation[],
    FedimintBridge,
    { state: CommonState }
>('federation/refreshFederations', async (fedimint, { dispatch, getState }) => {
    const federations = await fedimint.listFederations()
    log.info('refreshFederations', 'federations', federations)
    const externalMeta = await fetchFederationsExternalMetadata(
        federations,
        (federationId, meta) => {
            dispatch(setFederationExternalMeta({ federationId, meta }))
        },
    )
    dispatch(updateExternalMeta(externalMeta))
    dispatch(setFederations(federations))
    return selectFederations(getState())
})

export const joinFederation = createAsyncThunk<
    Federation,
    { fedimint: FedimintBridge; code: string },
    { state: CommonState }
>(
    'federation/joinFederation',
    async ({ fedimint, code }, { dispatch, getState }) => {
        const federation = await fedimint.joinFederation(code)

        // TODO: Run this check _before_ fedimint.joinFederation. Need a bridge
        // method for getting federationId from invite code.
        const existingFederations = selectFederations(getState())
        if (existingFederations.find(f => f.id === federation.id)) {
            throw new Error('errors.you-have-already-joined')
        }

        await dispatch(refreshFederations(fedimint))
        dispatch(setActiveFederationId(federation.id))

        const activeFederation = selectActiveFederation(getState())
        if (!activeFederation) throw new Error('errors.unknown-error')
        return activeFederation
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

export const selectFederations = createSelector(
    (s: CommonState) => s.federation.federations,
    (s: CommonState) => s.federation.externalMeta,
    (federations, externalMeta) =>
        federations.map(f => {
            const meta = externalMeta[f.id]
            if (!meta) {
                return f
            }
            return {
                ...f,
                meta,
                name: meta.federation_name || f.name,
            }
        }),
)

export const selectActiveFederation = createSelector(
    selectFederations,
    (s: CommonState) => s.federation.activeFederationId,
    (federations, activeFederationId) =>
        activeFederationId
            ? federations.find(f => f.id === activeFederationId) ||
              federations[0]
            : federations[0],
)

export const selectActiveFederationId = (s: CommonState) => {
    return selectActiveFederation(s)?.id
}

export const selectFederationMetadata = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.meta : {}
    },
)

export const selectFederationBalance = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.balance : (0 as MSats)
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

// TODO: decide where to put these...
export const selectStableBalance = (_: CommonState) => {
    return 100
}
export const selectStableCurrency = (_: CommonState): SupportedCurrency => {
    return SupportedCurrency.USD
}
export const selectStableBalancePending = (_: CommonState) => {
    return -50
}
