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

export const decreaseStableBalance = createAsyncThunk<
    Promise<boolean>,
    { fedimint: FedimintBridge; amount: RpcAmount },
    { state: CommonState }
>(
    'wallet/decreaseStableBalance',
    async ({ fedimint, amount }, { getState }) => {
        try {
            const state = getState()
            const activeFederationId = selectActiveFederation(state)?.id
            if (!activeFederationId) throw new Error('No active federation')
            const btcExchangeRate = selectBtcExchangeRate(state)
            const stableBalance = selectStableBalance(state)
            const stableBalancePending = selectStableBalancePending(state)
            const stableBalanceMsats = amountUtils.fiatToMsat(
                stableBalance,
                btcExchangeRate,
            )
            const stableBalancePendingMsats = amountUtils.fiatToMsat(
                stableBalancePending,
                btcExchangeRate,
            )
            let lockedBps = 0
            let unlockedAmount = 0 as MSats

            // if we have enough pending balance to cover the withdrawal
            // no need to calculate basis points on stable balance
            if (amount < stableBalancePendingMsats) {
                unlockedAmount = amount
            } else {
                // otherwise withdraw the full pending balance
                // and calculate what portion of the stable balance
                // is needed to fulfill the withdrawal amount
                unlockedAmount = stableBalancePendingMsats
                const remainingWithdrawal = Number(
                    (amount - stableBalancePendingMsats).toFixed(2),
                )
                lockedBps = Number(
                    (
                        Number((remainingWithdrawal * 10000).toFixed(0)) /
                        stableBalanceMsats
                    ).toFixed(0),
                )
            }

            await fedimint.stabilityPoolWithdraw(
                lockedBps,
                unlockedAmount,
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

export const selectTotalLockedSeeksFiat = createSelector(
    selectStabilityPoolAccountInfo,
    (s: CommonState) => selectBtcExchangeRate(s),
    (s: CommonState) => selectUsdExchangeRate(s),
    (stabilityPoolAccountInfo, btcExchangeRate, usdExchangeRate) => {
        if (!stabilityPoolAccountInfo) return 0

        let totalLockedSeeksAmount = 0
        const { lockedSeeks } = stabilityPoolAccountInfo
        totalLockedSeeksAmount = lockedSeeks.reduce(
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
                const lockedSeekBalance = Number(
                    (remainingAmountFiat - feesPaidInFiat).toFixed(2),
                )
                result = Number((result + lockedSeekBalance).toFixed(2))

                return result
            },
            0,
        )

        return totalLockedSeeksAmount
    },
)

export const selectStableBalance = createSelector(
    selectStabilityPoolAccountInfo,
    selectTotalLockedSeeksFiat,
    (stabilityPoolAccountInfo, totalLockedSeeksFiat) => {
        if (!stabilityPoolAccountInfo) return 0

        let stableBalance = totalLockedSeeksFiat
        const { stagedCancellation } = stabilityPoolAccountInfo

        if (stagedCancellation) {
            // convert bps to decimal
            const cancelledFraction = Number(
                (stagedCancellation / 10000).toFixed(4),
            )
            // calculate balance without cancelledFraction
            const pendingWithdrawalAmount = Number(
                (stableBalance * cancelledFraction).toFixed(2),
            )
            stableBalance = Number(
                (stableBalance - pendingWithdrawalAmount).toFixed(2),
            )
        }

        return stableBalance
    },
)

export const selectStableBalancePending = createSelector(
    selectStabilityPoolAccountInfo,
    (s: CommonState) => selectBtcExchangeRate(s),
    selectTotalLockedSeeksFiat,
    (stabilityPoolAccountInfo, btcExchangeRate, totalLockedSeeksFiat) => {
        if (!stabilityPoolAccountInfo) return 0

        let stableBalancePending = 0
        let pendingDepositAmount = 0
        let pendingWithdrawAmount = 0
        const { stagedCancellation, stagedSeeks } = stabilityPoolAccountInfo

        const pendingDepositAmountMsats = stagedSeeks.reduce(
            (result: number, ss: RpcAmount) => Number((result + ss).toFixed(0)),
            0,
        ) as MSats
        pendingDepositAmount = amountUtils.msatToFiat(
            pendingDepositAmountMsats,
            btcExchangeRate,
        )
        if (stagedCancellation) {
            const cancelledFraction = Number(
                (stagedCancellation / 10000).toFixed(4),
            )
            pendingWithdrawAmount = Number(
                (totalLockedSeeksFiat * cancelledFraction).toFixed(2),
            )
        }
        stableBalancePending = Number(
            (pendingDepositAmount - pendingWithdrawAmount).toFixed(2),
        )

        return stableBalancePending
    },
)

export const selectStabilityTransactionHistory = createSelector(
    selectStabilityPoolAccountInfo,
    stabilityPoolAccountInfo => {
        if (!stabilityPoolAccountInfo) return []

        return []
    },
)

export const selectWithdrawableStableBalance = createSelector(
    selectStableBalance,
    selectStableBalancePending,
    (stableBalance, stableBalancePending) => {
        return stableBalance + stableBalancePending
    },
)

export const selectAmountToWithdraw = createSelector(
    selectStableBalance,
    selectStableBalancePending,
    (stableBalance, stableBalancePending) => {
        return stableBalance + stableBalancePending
    },
)
