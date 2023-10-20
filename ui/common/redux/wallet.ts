import {
    createSlice,
    PayloadAction,
    createAsyncThunk,
    createSelector,
} from '@reduxjs/toolkit'

import {
    CommonState,
    selectActiveFederation,
    selectBtcExchangeRate,
    selectCurrency,
    selectUsdExchangeRate,
} from '.'
import { Federation, MSats, UsdCents } from '../types'
import {
    RpcAmount,
    RpcLockedSeek,
    RpcStabilityPoolAccountInfo,
} from '../types/bindings'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'

type FederationPayloadAction<T = object> = PayloadAction<
    { federationId: string } & T
>

/*** Initial State ***/

const initialFederationWalletState = {
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
            fetchStabilityPoolAccountInfo.fulfilled,
            (state, action) => {
                const { federationId } = action.meta.arg
                const federation = getFederationWalletState(state, federationId)
                state[federationId] = {
                    ...federation,
                    ...action.payload,
                }
            },
        )
    },
})

/*** Basic actions ***/

export const {
    setStabilityPoolAccountInfo,
    resetFederationWalletState,
    resetWalletState,
} = walletSlice.actions

/*** Async thunk actions ***/

export const fetchStabilityPoolAccountInfo = createAsyncThunk<
    RpcStabilityPoolAccountInfo,
    { fedimint: FedimintBridge; federationId: string },
    { state: CommonState }
>(
    'wallet/fetchStabilityPoolAccountInfo',
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

export const refreshActiveStabilityPool = createAsyncThunk<
    void,
    { fedimint: FedimintBridge },
    { state: CommonState }
>(
    'wallet/refreshActiveStabilityPool',
    async ({ fedimint }, { dispatch, getState }) => {
        const state = getState()
        const federationId = state.federation.activeFederationId
        if (!federationId) throw new Error('errors.unknown-error')

        await dispatch(
            fetchStabilityPoolAccountInfo({
                fedimint,
                federationId,
            }),
        ).unwrap()
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
    getFederationWalletState(s.wallet, s.federation.activeFederationId || '')

export const selectStabilityPoolAccountInfo = (s: CommonState) =>
    selectFederationWalletState(s).stabilityPoolAccountInfo

export const selectStableBalance = createSelector(
    selectStabilityPoolAccountInfo,
    selectBtcExchangeRate,
    selectUsdExchangeRate,
    selectCurrency,
    (stabilityPoolAccountInfo, btcExchangeRate, usdExchangeRate) => {
        if (!stabilityPoolAccountInfo) return 0

        let stableBalance = 0
        const { lockedSeeks, stagedCancellation } = stabilityPoolAccountInfo

        stableBalance = lockedSeeks.reduce(
            (result: number, ls: RpcLockedSeek) => {
                const {
                    initialAmountCents,
                    withdrawnAmountCents,
                    feesPaidSoFar,
                } = ls
                const remainingAmountCents = (initialAmountCents -
                    withdrawnAmountCents) as UsdCents
                const remainingAmountFiat = amountUtils.convertCentsToOtherFiat(
                    remainingAmountCents,
                    usdExchangeRate,
                    btcExchangeRate,
                )
                const feesPaidInFiat = amountUtils.msatToFiat(
                    feesPaidSoFar,
                    btcExchangeRate,
                )
                result += remainingAmountFiat - feesPaidInFiat

                return result
            },
            0,
        )

        // TODO: refactor after unit is known
        if (stagedCancellation) stableBalance -= stagedCancellation

        return stableBalance
    },
)

export const selectStableBalancePending = createSelector(
    selectStabilityPoolAccountInfo,
    selectBtcExchangeRate,
    (stabilityPoolAccountInfo, btcExchangeRate) => {
        if (!stabilityPoolAccountInfo) return 0

        let stableBalancePending = 0
        const { stagedSeeks } = stabilityPoolAccountInfo

        stableBalancePending = stagedSeeks.reduce(
            (result: number, ss: RpcAmount) => result + ss,
            0,
        )
        const stableBalanceFiatValue = amountUtils.msatToFiat(
            stableBalancePending as MSats,
            btcExchangeRate,
        )

        return stableBalanceFiatValue
    },
)

export const selectStabilityTransactionHistory = createSelector(
    selectStabilityPoolAccountInfo,
    stabilityPoolAccountInfo => {
        if (!stabilityPoolAccountInfo) return []

        return []
    },
)
