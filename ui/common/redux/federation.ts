import {
    createAsyncThunk,
    createSelector,
    createSlice,
    PayloadAction,
} from '@reduxjs/toolkit'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import orderBy from 'lodash/orderBy'
import { makeLog } from '../utils/log'

import {
    CommonState,
    previewCommunityDefaultChats,
    previewGlobalDefaultChats,
} from '.'
import { FEDI_GLOBAL_COMMUNITY } from '../constants/community'
import {
    ClientConfigMetadata,
    Federation,
    FederationListItem,
    FederationMaybeLoading,
    FediMod,
    Guardian,
    LoadedFederation,
    MatrixRoom,
    MSats,
    Network,
    PublicFederation,
    Sats,
} from '../types'
import { RpcJsonClientConfig, RpcStabilityPoolConfig } from '../types/bindings'
import amountUtils from '../utils/AmountUtils'
import {
    coerceFederationListItem,
    fetchFederationsExternalMetadata,
    getFederationFediMods,
    getFederationGroupChats,
    getFederationMaxBalanceMsats,
    getFederationMaxInvoiceMsats,
    getFederationMaxStableBalanceMsats,
    getFederationName,
    getFederationPinnedMessage,
    getFederationStatus,
    getFederationWelcomeMessage,
    joinFromInvite,
} from '../utils/FederationUtils'
import type { FedimintBridge } from '../utils/fedimint'
import { makeChatFromPreview } from '../utils/matrix'
import { upsertRecordEntityId } from '../utils/redux'
import { loadFromStorage } from './storage'

const log = makeLog('common/redux/federation')

/*** Initial State ***/

const initialState = {
    federations: [] as FederationMaybeLoading[],
    publicFederations: [] as PublicFederation[],
    activeFederationId: null as string | null,
    payFromFederationId: null as string | null,
    authenticatedGuardian: null as Guardian | null,
    externalMeta: {} as Record<
        Federation['id'],
        ClientConfigMetadata | undefined
    >,
    customFediMods: {} as Record<Federation['id'], FediMod[] | undefined>,
    defaultCommunityChats: {} as Record<Federation['id'], MatrixRoom[]>,
}

export type FederationState = typeof initialState

/*** Slice definition ***/

export const federationSlice = createSlice({
    name: 'federation',
    initialState,
    reducers: {
        setFederations(state, action: PayloadAction<FederationMaybeLoading[]>) {
            let hasAnyUpdates = false

            const updatedFederations = state.federations.map(
                existingFederation => {
                    const federationToUpsert = action.payload.find(
                        f => f.id === existingFederation.id,
                    )
                    if (!federationToUpsert) return existingFederation

                    // Merge meta objects, preserving existing fields
                    const mergedMeta = {
                        ...existingFederation.meta,
                        ...federationToUpsert.meta,
                    }
                    const updatedFederation: FederationMaybeLoading = {
                        ...existingFederation,
                        ...federationToUpsert,
                        meta: mergedMeta,
                    }

                    const hasUpdates = !isEqual(
                        existingFederation,
                        updatedFederation,
                    )
                    if (hasUpdates) hasAnyUpdates = true

                    return hasUpdates ? updatedFederation : existingFederation
                },
            )

            // Add new federations that don't exist in the current state
            const newFederations = action.payload.filter(
                newFed =>
                    !state.federations.some(
                        existingFed => existingFed.id === newFed.id,
                    ),
            )

            if (newFederations.length > 0) {
                hasAnyUpdates = true
            }

            // Only update state if there were changes
            if (hasAnyUpdates) {
                state.federations = [...updatedFederations, ...newFederations]
            }
        },
        setPublicFederations(state, action: PayloadAction<PublicFederation[]>) {
            state.publicFederations = action.payload
        },
        upsertFederation(
            state,
            action: PayloadAction<Partial<FederationMaybeLoading>>,
        ) {
            if (!action.payload.id) return
            const federationToUpsert: FederationMaybeLoading = {
                id: action.payload.id,
                init_state: 'ready',
                ...action.payload,
            }
            const existingFederation = state.federations.find(
                f => f.id === federationToUpsert.id,
            )

            if (existingFederation) {
                let hasUpdates = false
                const updatedFederations = state.federations.map(f => {
                    if (f.id !== federationToUpsert.id) return f

                    // Merge meta objects, preserving existing fields
                    const mergedMeta = {
                        ...f.meta,
                        ...federationToUpsert.meta,
                    }
                    const updatedFederation = {
                        ...f,
                        ...federationToUpsert,
                        meta: mergedMeta,
                    }
                    hasUpdates = !isEqual(f, updatedFederation)
                    return updatedFederation
                })

                // Only update state if there were changes
                if (hasUpdates) {
                    state.federations = updatedFederations
                }
            } else {
                // Federation doesn't exist, add it to the array
                state.federations = [...state.federations, federationToUpsert]
            }
        },
        updateFederationBalance(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                balance: Federation['balance']
            }>,
        ) {
            const { federationId, balance } = action.payload
            const federation = state.federations.find(
                f => f.id === federationId,
            )
            // No-op if we don't have that federation or it's a
            // no-wallet community or balance has not changed
            if (
                !federation ||
                !federation.hasWallet ||
                federation.balance === balance
            )
                return
            state.federations = state.federations.map(f => {
                if (f.id !== federationId) return f
                return { ...f, balance }
            })
        },
        setActiveFederationId(state, action: PayloadAction<string | null>) {
            state.activeFederationId = action.payload
        },
        setPayFromFederationId(state, action: PayloadAction<string | null>) {
            state.payFromFederationId = action.payload
        },
        setFederationCustomFediMods(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                mods: FediMod[] | undefined
            }>,
        ) {
            const { federationId, mods } = action.payload
            if (isEqual(mods, state.customFediMods[federationId] || [])) return

            state.customFediMods = {
                ...state.customFediMods,
                [federationId]: mods,
            }
        },
        setFederationExternalMeta(
            state,
            action: PayloadAction<{
                federationId: Federation['id']
                meta: ClientConfigMetadata | undefined
            }>,
        ) {
            state.externalMeta = upsertRecordEntityId(
                state.externalMeta,
                action.payload.meta,
                action.payload.federationId,
            )
        },
        changeAuthenticatedGuardian(
            state,
            action: PayloadAction<Guardian | null>,
        ) {
            state.authenticatedGuardian = action.payload
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
            if (state.customFediMods[federationId]) {
                state.customFediMods = omit(state.customFediMods, federationId)
            }
        })

        builder.addCase(loadFromStorage.fulfilled, (state, action) => {
            if (!action.payload) return
            state.activeFederationId = action.payload.activeFederationId
            state.authenticatedGuardian = action.payload.authenticatedGuardian
            state.externalMeta = action.payload.externalMeta
            state.customFediMods = action.payload.customFediMods || {}
        })

        builder.addCase(
            previewCommunityDefaultChats.fulfilled,
            (state, action) => {
                const chatPreviews = action.payload.map(makeChatFromPreview)
                const federationId = action.meta.arg
                state.defaultCommunityChats = isEqual(
                    chatPreviews,
                    state.defaultCommunityChats[federationId],
                )
                    ? state.defaultCommunityChats
                    : {
                          ...state.defaultCommunityChats,
                          [federationId]: chatPreviews,
                      }
            },
        )
    },
})

/*** Basic actions ***/

export const {
    setFederations,
    setPublicFederations,
    upsertFederation,
    updateFederationBalance,
    setActiveFederationId,
    setPayFromFederationId,
    setFederationCustomFediMods,
    setFederationExternalMeta,
    changeAuthenticatedGuardian,
    removeCustomFediMod,
} = federationSlice.actions

/*** Async thunk actions */

export const refreshFederations = createAsyncThunk<
    FederationMaybeLoading[],
    FedimintBridge,
    { state: CommonState }
>('federation/refreshFederations', async (fedimint, { dispatch, getState }) => {
    const federationsList = await fedimint.listFederations()

    log.info(`refreshing ${federationsList.length} federations`)

    const federations: FederationMaybeLoading[] = federationsList.map(f => {
        const federation: FederationMaybeLoading = {
            id: f.id,
            init_state: f.init_state,
            status: 'online',
            network: undefined,
            hasWallet: true as const,
        }
        if (f.init_state === 'ready') {
            /*
                Client-side network failure will cause getFederationStatus to
                hang and timeout after 10 seconds so we assume online by default
                and instead fetch the status in the background. This should mean
                a smoother UX since we avoid flickering indicators and don't block
                the initial app load.
            */
            getFederationStatus(fedimint, f.id)
                .then(updatedStatus => {
                    dispatch(
                        upsertFederation({
                            id: f.id,
                            status: updatedStatus,
                        }),
                    )
                })
                .catch(error => {
                    log.error(
                        `Error in background status fetch for federation ${f.id}:`,
                        error,
                    )
                })
            // network will not be known unless init_state = ready
            return {
                ...federation,
                network: f.network as Network,
            }
        }
        return federation
    })

    const communities = await fedimint.listCommunities({})
    const communitiesAsFederations = communities.map(coerceFederationListItem)

    const allFederations = [...federations, ...communitiesAsFederations]
    dispatch(setFederations(allFederations))

    // Create externalMeta object directly from federation data since
    // bridge does the external meta URL fetching now
    // TODO: Remove this along with the refactor to use federation.federations
    // as the source of truth for all metadata and can remove the need to maintain
    // and update this externalMeta slice in redux
    allFederations.map(federation => {
        if (federation.meta && Object.keys(federation.meta).length > 0) {
            dispatch(
                processFederationMeta({
                    federation,
                }),
            )
        }
    })
    // note: this await should only block for 2 seconds maximum. if internet is slow
    // it will abort and retry in the background
    // TODO: Move the global community meta fetch to the bridge
    await fetchFederationsExternalMetadata(
        // For the purposes of gathering metadata, we need to
        // treat the global community as a "wallet" federation.
        // The means we'll fetch the external metadata for it.
        [{ ...FEDI_GLOBAL_COMMUNITY, hasWallet: true }],
        (federationId, meta) => {
            dispatch(
                processFederationMeta({
                    federation: { id: federationId, init_state: 'ready', meta },
                }),
            )
        },
    )
    return selectFederations(getState())
})

export const processFederationMeta = createAsyncThunk<
    void,
    { federation: FederationMaybeLoading },
    { state: CommonState }
>('federation/processFederationMeta', async ({ federation }, { dispatch }) => {
    if (!federation.meta) return

    // TODO: Remove this along with the refactor to use federation.federations
    // as the source of truth for all metadata and can remove the need to maintain
    // and update this externalMeta slice in redux for federation meta
    dispatch(
        setFederationExternalMeta({
            federationId: federation.id,
            meta: federation.meta,
        }),
    )

    // fedimods & default chats are derived from the federation meta
    dispatch(
        setFederationCustomFediMods({
            federationId: federation.id,
            mods: getFederationFediMods(federation.meta),
        }),
    )
    // use a special preview action for the global community since it is
    // not stored in redux
    if (federation.id === FEDI_GLOBAL_COMMUNITY.id) {
        dispatch(previewGlobalDefaultChats())
    } else {
        dispatch(previewCommunityDefaultChats(federation.id))
    }
})

export const joinFederation = createAsyncThunk<
    FederationListItem,
    { fedimint: FedimintBridge; code: string; recoverFromScratch?: boolean },
    { state: CommonState }
>(
    'federation/joinFederation',
    async (
        { fedimint, code, recoverFromScratch = false },
        { dispatch, getState },
    ) => {
        const federation = await joinFromInvite(
            fedimint,
            code,
            recoverFromScratch,
        )

        await dispatch(refreshFederations(fedimint))
        dispatch(setActiveFederationId(federation.id))
        // matrix client should be initialized by now
        // so we can join default groups
        dispatch(previewCommunityDefaultChats(federation.id))

        const activeFederation = selectActiveFederation(getState())
        if (!activeFederation) throw new Error('errors.unknown-error')
        return activeFederation
    },
)

export const leaveFederation = createAsyncThunk<
    void,
    { fedimint: FedimintBridge; federationId: string },
    { state: CommonState }
>(
    'federation/leaveFederation',
    async ({ fedimint, federationId }, { getState }) => {
        const federation = selectFederation(getState(), federationId)
        if (!federation) throw new Error('failed-to-leave-federation')

        // for communities, the federation id is the invite code
        if (!federation.hasWallet) {
            await fedimint.leaveCommunity({ inviteCode: federationId })
            return
        }

        // Fixes https://github.com/fedibtc/fedi/issues/3754
        const isRecovering = selectIsAnyFederationRecovering(getState())
        if (isRecovering || !federation)
            throw new Error('failed-to-leave-federation')

        if (federation.hasWallet) await fedimint.leaveFederation(federationId)
        // for communities, the federation id is the invite code
        else fedimint.leaveCommunity({ inviteCode: federationId })
    },
)

/*** Selectors ***/

export const selectLoadedFederations = createSelector(
    (s: CommonState) => s.federation.federations,
    federations =>
        federations.reduce(
            (acc: LoadedFederation[], f: FederationMaybeLoading) => {
                if (f.init_state === 'ready') {
                    const loadedFederation: LoadedFederation = {
                        ...f,
                        init_state: 'ready',
                        name: getFederationName(f.meta || {}) || f.name || '',
                    } as LoadedFederation
                    acc.push(loadedFederation)
                }
                return acc
            },
            [],
        ),
)

export const selectWalletFederations = createSelector(
    selectLoadedFederations,
    loadedFederations =>
        loadedFederations.flatMap(f => {
            // Only include wallet federations
            if (!f.hasWallet) return []

            return [
                {
                    ...f,
                    name: getFederationName(f.meta) || f.name,
                },
            ]
        }),
)

export const selectFederations = createSelector(
    (s: CommonState) => s.federation.federations,
    federations =>
        federations
            .map((f: FederationMaybeLoading) => ({
                ...f,
                name: getFederationName(f.meta || {}) || f.name || '',
            }))
            // We temporarily filter out failed federations until we have UI designs for this state
            .filter(f => f.init_state !== 'failed'),
)

export const selectAlphabeticallySortedFederations = createSelector(
    selectLoadedFederations,
    federations => {
        return orderBy(
            federations,
            federation => federation.name?.toLowerCase() || '',
            'asc',
        )
    },
)

export const selectFederationIds = createSelector(
    selectFederations,
    federations => federations.map(f => f.id),
)

export const selectActiveFederation = createSelector(
    selectLoadedFederations,
    (s: CommonState) => s.federation.activeFederationId,
    (federations, activeFederationId): FederationListItem | undefined =>
        activeFederationId
            ? federations.find(f => f.id === activeFederationId) ||
              federations[0]
            : federations[0],
)

export const selectFederation = (s: CommonState, id: string) =>
    selectFederations(s).find(f => f.id === id)

export const selectLoadedFederation = (s: CommonState, id: string) =>
    selectLoadedFederations(s).find(f => f.id === id)

export const selectActiveFederationId = (s: CommonState) => {
    return selectActiveFederation(s)?.id
}

export const selectPaymentFederation = createSelector(
    selectWalletFederations,
    selectActiveFederation,
    (s: CommonState) => s.federation.payFromFederationId,
    (
        federations,
        activeFederation,
        payFromFederationId,
    ): Federation | undefined => {
        if (!payFromFederationId) {
            return activeFederation?.hasWallet ? activeFederation : undefined
        }

        return federations.find(f => f.id === payFromFederationId)
    },
)

export const selectFederationClientConfig = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation && activeFederation.hasWallet
            ? activeFederation.clientConfig
            : null
    },
)

export const selectFederationStabilityPoolConfig = createSelector(
    selectFederationClientConfig,
    config => {
        if (!config) return null

        if ('modules' in config) {
            const { modules } = config as RpcJsonClientConfig
            for (const key in modules) {
                // TODO: add better typing for this
                const fmModule = modules[key] as Partial<{ kind: string }>
                if (fmModule.kind === 'stability_pool') {
                    return fmModule as RpcStabilityPoolConfig
                }
            }
        }
        return null
    },
)

export const selectFederationFeeSchedule = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation && activeFederation.hasWallet
            ? activeFederation.fediFeeSchedule
            : null
    },
)

export const selectEcashFeeSchedule = createSelector(
    selectFederationFeeSchedule,
    feeSchedule => {
        if (!feeSchedule) return null
        const { modules } = feeSchedule
        if ('mint' in modules) {
            return modules['mint']
        }
    },
)

export const selectStabilityPoolFeeSchedule = createSelector(
    selectFederationFeeSchedule,
    feeSchedule => {
        if (!feeSchedule) return null
        const { modules } = feeSchedule
        if ('stability_pool' in modules) {
            return modules['stability_pool']
        }
    },
)

export const selectFederationMetadata = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.meta : {}
    },
)

export const selectGlobalCommunityMeta = createSelector(
    (s: CommonState) => s.federation.externalMeta,
    externalMeta => externalMeta[FEDI_GLOBAL_COMMUNITY.id],
)

export const selectFederationBalance = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation && activeFederation.hasWallet
            ? activeFederation.balance
            : (0 as MSats)
    },
)

export const selectPaymentFederationBalance = createSelector(
    selectPaymentFederation,
    payFromFederation => {
        return payFromFederation ? payFromFederation.balance : (0 as MSats)
    },
)

export const selectIsActiveFederationRecovering = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation && activeFederation.hasWallet
            ? activeFederation.recovering
            : false
    },
)
export const selectFederationHasWallet = (federation: FederationListItem) =>
    federation.hasWallet

export const selectActiveFederationHasWallet = createSelector(
    selectActiveFederation,
    activeFederation => {
        return activeFederation ? activeFederation.hasWallet : false
    },
)

export const selectIsAnyFederationRecovering = createSelector(
    selectFederations,
    federations => {
        return federations.some(f => f.hasWallet && f.recovering)
    },
)

export const selectFederationCustomFediMods = (
    s: CommonState,
    federationId: Federation['id'],
) => {
    const federation = selectLoadedFederation(s, federationId)
    return federation ? s.federation.customFediMods[federation?.id] || [] : []
}

export const selectActiveFederationCustomFediMods = (s: CommonState) => {
    const activeFederation = selectActiveFederation(s)
    return activeFederation
        ? s.federation.customFediMods[activeFederation?.id] || []
        : []
}

export const selectActiveFederationChats = (s: CommonState) => {
    const activeFederation = selectActiveFederation(s)
    return activeFederation
        ? s.federation.defaultCommunityChats[activeFederation.id] || []
        : []
}

export const selectMaxStableBalanceSats = createSelector(
    selectFederationMetadata,
    (metadata): Sats => {
        const maxStableBalanceMsats =
            metadata && getFederationMaxStableBalanceMsats(metadata)

        if (maxStableBalanceMsats === 0) return 0 as Sats

        return maxStableBalanceMsats
            ? amountUtils.msatToSat(maxStableBalanceMsats)
            : (0 as Sats)
    },
)

// For now we are setting a high default of 10 BTC unless otherwise
// specified by the federation feature flags. At some points we probably
// can remove this hard-coded value altogether
const MAX_INVOICE_AMOUNT_SATS = 1_000_000_000 as Sats
const MAX_BALANCE_AMOUNT_SATS = 1_000_000_000 as Sats

export const selectMaxInvoiceAmount = createSelector(
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
    selectMaxInvoiceAmount,
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

export const selectCommunityMods = createSelector(
    (s: CommonState) => s.federation.customFediMods,
    customFediMods => Object.values(customFediMods).flatMap(mods => mods ?? []),
)

export const selectActiveFederationFediMods = createSelector(
    (s: CommonState) => s.federation.activeFederationId,
    (s: CommonState) => s.federation.customFediMods,
    (activeFederationId, customFediMods) => {
        return activeFederationId
            ? customFediMods[activeFederationId] || []
            : []
    },
)

export const selectFederationGroupChats = createSelector(
    selectFederationMetadata,
    getFederationGroupChats,
)

export const selectFederationWelcomeMessage = createSelector(
    selectFederationMetadata,
    getFederationWelcomeMessage,
)

export const selectFederationPinnedMessage = createSelector(
    selectFederationMetadata,
    getFederationPinnedMessage,
)
