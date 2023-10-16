import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'

import { CommonState, selectActiveFederation } from '.'
import { Federation, SupportedCurrency } from '../types'
import { RpcAmount, RpcStabilityPoolAccountInfo } from '../types/bindings'
import { FedimintBridge } from '../utils/fedimint'

type FederationPayloadAction<T = object> = PayloadAction<
    { federationId: string } & T
>

/*** Initial State ***/

const initialFederationWalletState = {
    stableCurrency: SupportedCurrency.USD as SupportedCurrency,
    stableBalance: 0 as number,
    stableBalancePending: 0 as number,
    stabilityPoolAccountInfo: null as RpcStabilityPoolAccountInfo | null,
}
type FederationWalletState = typeof initialFederationWalletState

// All wallet state is keyed by federation id to keep federation wallets separate, so it starts as an empty object.
const initialState = {} as Record<
    Federation['id'],
    FederationWalletState | undefined
>

export type WalletState = typeof initialState

/*** Slice definition ***/

const getFederationWalletState = (state: WalletState, federationId: string) =>
    state[federationId] || {
        ...initialFederationWalletState,
    }

export const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        setStabilityPoolAccountInfo(
            state,
            action: FederationPayloadAction<{
                stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo
            }>,
        ) {
            const { federationId, stabilityPoolAccountInfo } = action.payload
            state[federationId] = {
                ...getFederationWalletState(state, federationId),
                stabilityPoolAccountInfo,
            }
        },
        resetFederationWalletState(state, action: FederationPayloadAction) {
            state[action.payload.federationId] = {
                ...initialFederationWalletState,
            }
        },
        resetWalletState() {
            return { ...initialState }
        },
    },
    extraReducers: builder => {
        builder.addCase(
            refreshStabilityPoolAccountInfo.fulfilled,
            (state, action) => {
                const { federationId } = action.meta.arg
                const federation = getFederationWalletState(state, federationId)
                state[federationId] = {
                    ...federation,
                    ...action.payload,
                }
            },
        )

        // builder.addCase(loadFromStorage.fulfilled, (state, action) => {
        //     if (!action.payload) return
        //     Object.entries(action.payload.wallet).forEach(
        //         ([federationId, walletState]) => {
        //             if (!walletState) return
        //             const prevWalletState = getFederationWalletState(
        //                 state,
        //                 federationId,
        //             )
        //             state[federationId] = {
        //                 ...prevWalletState,
        //                 stableBalance: walletState.stableBalance,
        //             }
        //         },
        //     )
        // })
    },
})

/*** Basic actions ***/

export const {
    setStabilityPoolAccountInfo,
    resetFederationWalletState,
    resetWalletState,
} = walletSlice.actions

/*** Async thunk actions ***/

export const refreshStabilityPoolAccountInfo = createAsyncThunk<
    RpcStabilityPoolAccountInfo,
    { fedimint: FedimintBridge; federationId: string },
    { state: CommonState }
>(
    'wallet/refreshStabilityPoolAccountInfo',
    async ({ fedimint, federationId }, { dispatch }) => {
        const accountInfo = await fedimint.stabilityPoolAccountInfo(
            federationId,
        )
        dispatch(
            setStabilityPoolAccountInfo({
                federationId,
                stabilityPoolAccountInfo: accountInfo,
            }),
        )
        return accountInfo
    },
)

export const increaseStableBalance = createAsyncThunk<
    Promise<boolean>,
    { fedimint: FedimintBridge; amount: RpcAmount },
    { state: CommonState }
>(
    'wallet/increaseStableBalance',
    async ({ fedimint, amount }, { getState }) => {
        try {
            const state = getState()
            const activeFederationId = selectActiveFederation(state)?.id
            if (!activeFederationId) throw new Error('No active federation')
            await fedimint.stabilityPoolDepositToSeek(
                amount,
                activeFederationId,
            )
            return true
        } catch (error) {
            return false
        }
    },
)

/*** Selectors ***/

const selectFederationWalletState = (s: CommonState) =>
    getFederationWalletState(s.wallet, selectActiveFederation(s)?.id || '')

export const selectStableBalance = (s: CommonState) =>
    selectFederationWalletState(s).stableBalance

export const selectStableCurrency = (s: CommonState) =>
    selectFederationWalletState(s).stableCurrency

export const selectStableBalancePending = (s: CommonState) =>
    selectFederationWalletState(s).stableBalancePending
