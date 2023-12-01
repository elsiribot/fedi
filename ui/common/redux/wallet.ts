import {
    createSlice,
    PayloadAction,
    createAsyncThunk,
    createSelector,
} from '@reduxjs/toolkit'
import orderBy from 'lodash/orderBy'

import {
    CommonState,
    selectActiveFederation,
    selectBtcExchangeRate,
    selectBtcUsdExchangeRate,
    selectFederationStabilityPoolConfig,
} from '.'
import { Federation, MSats, StabilityPoolTxn, Usd, UsdCents } from '../types'
import {
    RpcAmount,
    RpcLockedSeek,
    RpcStabilityPoolAccountInfo,
    StabilityPoolDepositEvent,
    StabilityPoolWithdrawalEvent,
} from '../types/bindings'
import amountUtils from '../utils/AmountUtils'
import { FedimintBridge } from '../utils/fedimint'
import { makeLog } from '../utils/log'

const log = makeLog('native/redux/wallet')

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
    Promise<StabilityPoolDepositEvent>,
    {
        fedimint: FedimintBridge
        amount: RpcAmount
    },
    { state: CommonState }
>(
    'wallet/increaseStableBalance',
    async ({ fedimint, amount }, { getState }) => {
        const state = getState()
        const activeFederationId = selectActiveFederation(state)?.id
        if (!activeFederationId) throw new Error('No active federation')

        const operationId = await fedimint.stabilityPoolDepositToSeek(
            amount,
            activeFederationId,
        )

        return new Promise<StabilityPoolDepositEvent>((resolve, reject) => {
            const unsubscribeOperation = fedimint.addListener(
                'stabilityPoolDeposit',
                (event: StabilityPoolDepositEvent) => {
                    if (
                        event.federationId === activeFederationId &&
                        event.operationId === operationId
                    ) {
                        log.info(
                            'StabilityPoolDepositEvent.state',
                            event.operationId,
                            event.state,
                        )
                        if (event.state === 'txAccepted') {
                            unsubscribeOperation()
                            resolve(event)
                        } else if (
                            typeof event.state === 'object' &&
                            'txRejected' in event.state
                        ) {
                            unsubscribeOperation()
                            reject('Transaction rejected')
                        }
                    }
                },
            )
        })
    },
)

export const decreaseStableBalance = createAsyncThunk<
    Promise<StabilityPoolWithdrawalEvent>,
    {
        fedimint: FedimintBridge
        amount: RpcAmount
    },
    { state: CommonState }
>(
    'wallet/decreaseStableBalance',
    async ({ fedimint, amount }, { getState }) => {
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
        const operationId = await fedimint.stabilityPoolWithdraw(
            lockedBps,
            unlockedAmount,
            activeFederationId,
        )
        return new Promise<StabilityPoolWithdrawalEvent>((resolve, reject) => {
            const unsubscribeOperation = fedimint.addListener(
                'stabilityPoolWithdrawal',
                (event: StabilityPoolWithdrawalEvent) => {
                    if (
                        event.federationId === activeFederationId &&
                        event.operationId === operationId
                    ) {
                        log.info(
                            'StabilityPoolWithdrawalEvent.state',
                            event.operationId,
                            event.state,
                        )
                        // Withdrawals may return the success state quickly if 100% of it was covered from stagedSeeks
                        // Otherwise, cancellationAccepted is the appropriate state to resolve
                        if (
                            event.state === 'success' ||
                            event.state === 'cancellationAccepted'
                        ) {
                            unsubscribeOperation()
                            resolve(event)
                        } else if (
                            typeof event.state === 'object' &&
                            ('txRejected' in event.state ||
                                'cancellationSubmissionFailure' in event.state)
                        ) {
                            unsubscribeOperation()
                            reject('Transaction rejected')
                        }
                    }
                },
            )
        })
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
    (s: CommonState) => selectBtcUsdExchangeRate(s),
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
    (s: CommonState) => selectBtcExchangeRate(s),
    (s: CommonState) => selectBtcUsdExchangeRate(s),
    selectTotalLockedSeeksFiat,
    (
        stabilityPoolAccountInfo,
        btcExchangeRate,
        _usdExchangeRate,
        totalLockedSeeksFiat,
    ) => {
        if (!stabilityPoolAccountInfo) return []
        const history: StabilityPoolTxn[] = []
        const { lockedSeeks, stagedSeeks, stagedCancellation } =
            stabilityPoolAccountInfo

        let completedWithdrawalsCents = 0 as UsdCents
        // Check stagedSeeks for pending deposits
        stagedSeeks.map((ss: MSats, i: number) => {
            const usdAmount = amountUtils.msatToFiat(ss, btcExchangeRate)
            const usdAmountCents = Number((usdAmount * 100).toFixed(2))

            history.push({
                id: `ss-${i}`,
                timestamp: null,
                amountCents: usdAmountCents as UsdCents,
                amountUsd: usdAmount as Usd,
                direction: 'deposit',
                status: 'pending',
            })
        })
        // All lockedSeeks are completed deposits. When a lockedSeek has been fully withdrawn will no longer be returned in stabilityPoolAccountInfo
        lockedSeeks.map((ls: RpcLockedSeek, i: number) => {
            history.push({
                id: `lsd-${i}`,
                timestamp: ls.firstLockStartTime,
                amountCents: ls.initialAmountCents as UsdCents,
                amountUsd: Number(
                    (ls.initialAmountCents / 100).toFixed(2),
                ) as Usd,
                direction: 'deposit',
                status: 'complete',
            })
            // Tally up the withdrawn amounts from each seek
            if (ls.withdrawnAmountCents > 0) {
                completedWithdrawalsCents = (completedWithdrawalsCents +
                    ls.withdrawnAmountCents) as UsdCents
            }
        })

        // TODO: Figure out how to display individual withdrawals by reconciling this data with listTransactions RPC... for now we aggregate:
        //  Display 1 aggregate transaction representing all withdrawals
        if (completedWithdrawalsCents > 0) {
            const withdrawnUsd = Number(
                (completedWithdrawalsCents / 100).toFixed(2),
            )
            history.push({
                id: `completed-withdrawal`,
                timestamp: null,
                amountCents: completedWithdrawalsCents as UsdCents,
                amountUsd: withdrawnUsd as Usd,
                direction: 'withdraw',
                status: 'complete',
            })
        }
        //  Display 1 aggregate transaction representing all pending withdrawals
        if (stagedCancellation) {
            const cancelledFraction = Number(
                (stagedCancellation / 10000).toFixed(4),
            )
            const pendingWithdrawalUsd = Number(
                (totalLockedSeeksFiat * cancelledFraction).toFixed(2),
            )
            const pendingWithdrawalCents = Number(
                (pendingWithdrawalUsd * 100).toFixed(0),
            )
            history.push({
                id: `pending-withdrawal`,
                timestamp: null,
                amountCents: pendingWithdrawalCents as UsdCents,
                amountUsd: pendingWithdrawalUsd as Usd,
                direction: 'withdraw',
                status: 'pending',
            })
        }

        // orders by timestamp with null timestamps at the top
        return orderBy(history, ['timestamp', 'status'], ['desc', 'desc'])
    },
)

export const selectWithdrawableStableBalance = createSelector(
    selectStableBalance,
    selectStableBalancePending,
    (stableBalance, stableBalancePending) => {
        return stableBalance + stableBalancePending
    },
)

export const selectMinimumWithdrawAmount = createSelector(
    (s: CommonState) => selectFederationStabilityPoolConfig(s),
    selectStableBalance,
    selectStableBalancePending,
    (config, stableBalance, stableBalancePending) => {
        const minimumBasisPoints = config?.min_allowed_cancellation_bps || 0

        // No minimum withdraw amount if we can cancel pending deposits otherwise calculate minimum allowed cancellation from completed deposits
        if (stableBalancePending > 0) {
            return 0
        } else {
            // convert bps to decimal
            const minimumFraction = Number(
                (minimumBasisPoints / 10000).toFixed(4),
            )
            // calculate balance without cancelledFraction
            const minimumUsdAmount = Number(
                (stableBalance * minimumFraction).toFixed(2),
            )
            return minimumUsdAmount
        }
    },
)

export const selectMinimumDepositAmount = createSelector(
    (s: CommonState) => selectFederationStabilityPoolConfig(s),
    config => {
        const minimumMsats = config?.min_allowed_seek || 0
        return amountUtils.msatToSat(minimumMsats as MSats)
    },
)

/**
 * Get the max APR from the max allowed fee rate in parts per billion
 * This calculates what % of a deposit the user can expect to pay in fees
 * after 1 full year, deducting fees every 10 minutes compounding every cycle
 * TODO: Use the cycle_duration to dynamically calculate APR
 */
export const selectMaximumAPR = createSelector(
    (s: CommonState) => selectFederationStabilityPoolConfig(s),
    config => {
        const maxFeeRatePerCycle = config?.max_allowed_provide_fee_rate_ppb || 0
        // convert parts per billion to decimal
        const periodicRate = maxFeeRatePerCycle / 1_000_000_000
        // Number of 10 minute cycles in a year
        const cyclesPerYear = 365 * 24 * 6
        const compoundedAnnualRate =
            1 - Math.pow(1 - periodicRate, cyclesPerYear)
        const maxFeePercentage = (compoundedAnnualRate * 100).toFixed(3)
        return maxFeePercentage
    },
)
