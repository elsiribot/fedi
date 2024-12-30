import { PayloadAction } from '@reduxjs/toolkit';
import { TFunction } from 'i18next';
import { CommonState } from '.';
import { Federation, MSats, UsdCents } from '../types';
import { JSONObject, RpcAmount, RpcEcashInfo, RpcStabilityPoolAccountInfo, StabilityPoolDepositEvent, StabilityPoolWithdrawalEvent } from '../types/bindings';
import { FedimintBridge } from '../utils/fedimint';
type FederationPayloadAction<T = object> = PayloadAction<{
    federationId: string;
} & T>;
/*** Initial State ***/
declare const initialFederationWalletState: {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
    stabilityPoolAvailableLiquidity: MSats | null;
    cycleStartPrice: number | null;
    averageFeeRate: number | null;
};
type FederationWalletState = typeof initialFederationWalletState;
declare const initialState: Record<Federation["id"], FederationWalletState | undefined>;
export type WalletState = typeof initialState;
export declare const walletSlice: import("@reduxjs/toolkit").Slice<Record<string, {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
    stabilityPoolAvailableLiquidity: MSats | null;
    cycleStartPrice: number | null;
    averageFeeRate: number | null;
} | undefined>, {
    setStabilityPoolAccountInfo(state: import("immer/dist/internal").WritableDraft<Record<string, {
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
        stabilityPoolAvailableLiquidity: MSats | null;
        cycleStartPrice: number | null;
        averageFeeRate: number | null;
    } | undefined>>, action: FederationPayloadAction<{
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo;
    }>): void;
    setStabilityPoolAvailableLiquidity(state: import("immer/dist/internal").WritableDraft<Record<string, {
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
        stabilityPoolAvailableLiquidity: MSats | null;
        cycleStartPrice: number | null;
        averageFeeRate: number | null;
    } | undefined>>, action: FederationPayloadAction<{
        stabilityPoolAvailableLiquidity: MSats;
    }>): void;
    resetFederationWalletState(state: import("immer/dist/internal").WritableDraft<Record<string, {
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
        stabilityPoolAvailableLiquidity: MSats | null;
        cycleStartPrice: number | null;
        averageFeeRate: number | null;
    } | undefined>>, action: FederationPayloadAction): void;
    resetWalletState(): {
        [x: string]: {
            stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
            stabilityPoolAvailableLiquidity: MSats | null;
            cycleStartPrice: number | null;
            averageFeeRate: number | null;
        } | undefined;
    };
}, "wallet">;
/*** Basic actions ***/
export declare const setStabilityPoolAccountInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo;
}, "wallet/setStabilityPoolAccountInfo">, setStabilityPoolAvailableLiquidity: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    stabilityPoolAvailableLiquidity: MSats;
}, "wallet/setStabilityPoolAvailableLiquidity">, resetFederationWalletState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & object, "wallet/resetFederationWalletState">, resetWalletState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"wallet/resetWalletState">;
/*** Async thunk actions ***/
export declare const generateAddress: import("@reduxjs/toolkit").AsyncThunk<string, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const generateEcash: import("@reduxjs/toolkit").AsyncThunk<{
    ecash: string;
    cancelAt: number;
}, {
    fedimint: FedimintBridge;
    federationId: string;
    amount: MSats;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const generateInvoice: import("@reduxjs/toolkit").AsyncThunk<string, {
    fedimint: FedimintBridge;
    federationId: string;
    amount: MSats;
    description: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const payInvoice: import("@reduxjs/toolkit").AsyncThunk<{
    preimage: string;
}, {
    fedimint: FedimintBridge;
    federationId: string;
    invoice: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const receiveEcash: import("@reduxjs/toolkit").AsyncThunk<MSats, {
    fedimint: FedimintBridge;
    federationId: string;
    ecash: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const validateEcash: import("@reduxjs/toolkit").AsyncThunk<RpcEcashInfo, {
    fedimint: FedimintBridge;
    ecash: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const generateReusedEcashProofs: import("@reduxjs/toolkit").AsyncThunk<JSONObject[], {
    fedimint: FedimintBridge;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchStabilityPoolAccountInfo: import("@reduxjs/toolkit").AsyncThunk<RpcStabilityPoolAccountInfo, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchStabilityPoolAvailableLiquidity: import("@reduxjs/toolkit").AsyncThunk<MSats, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchStabilityPoolCycleStartPrice: import("@reduxjs/toolkit").AsyncThunk<number, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchStabilityPoolAverageFeeRate: import("@reduxjs/toolkit").AsyncThunk<number, {
    fedimint: FedimintBridge;
    federationId: string;
    numCycles: number;
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refreshActiveStabilityPool: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const increaseStableBalance: import("@reduxjs/toolkit").AsyncThunk<Promise<StabilityPoolDepositEvent>, {
    fedimint: FedimintBridge;
    amount: RpcAmount;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const decreaseStableBalance: import("@reduxjs/toolkit").AsyncThunk<Promise<StabilityPoolWithdrawalEvent>, {
    fedimint: FedimintBridge;
    amount: RpcAmount;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const selectStabilityPoolAccountInfo: (s: CommonState) => RpcStabilityPoolAccountInfo | null;
/**
 * Calculates the total amount locked in deposits in msats
 * */
export declare const selectTotalLockedMsats: ((state: CommonState) => MSats | 0) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null) => MSats | 0, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total amount locked in deposits in cents
 * */
export declare const selectTotalLockedCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: number) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total amount locked in deposits, converted to the selectedCurrency
 * */
export declare const selectTotalLockedFiat: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total amount of pending deposits in msats
 * */
export declare const selectTotalStagedMsats: (s: CommonState) => MSats;
/**
 * Converts total amount of pending deposits in msats to the current USD value in cents
 * */
export declare const selectTotalStagedCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: MSats, args_1: number) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the USD value of pending deposits to selectedCurrency
 * */
export declare const selectTotalStagedFiat: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total stable balance in cents
 * */
export declare const selectStableBalanceCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: UsdCents) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the total stable balance in cents to the selectedCurrency
 * */
export declare const selectStableBalance: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStableBalanceSats: ((state: CommonState) => import("../types").Sats) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number) => import("../types").Sats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the pending stable balance using:
 * 1. total locked seeks in cents to calculate pending withdrawals
 * 2. total staged seeks in cents (estimated USD value) to calculate pending deposits
 *
 * should be POSITIVE if net depositing, and NEGATIVE if net withdrawing
 * */
export declare const selectStableBalancePendingCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: UsdCents, args_2: UsdCents) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the pending stable balance in cents to the selectedCurrency
 * */
export declare const selectStableBalancePending: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectWithdrawableStableBalanceCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: UsdCents) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumWithdrawAmountCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null, args_1: UsdCents, args_2: UsdCents) => UsdCents, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectWithdrawableStableBalanceMsats: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number) => MSats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumWithdrawAmountMsats: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number) => MSats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumDepositAmount: ((state: CommonState) => import("../types").Sats) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null) => import("../types").Sats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Get the deposit time from stabilitypool cycle duration in human-readable format
 * */
export declare const selectFormattedDepositTime: ((state: CommonState, t: TFunction<"translation", undefined>) => string | 0) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null, args_1: TFunction<"translation", undefined>) => string | 0, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStabilityPoolCycleStartPrice: (s: CommonState, federationId?: Federation["id"]) => number | null;
export declare const selectStabilityPoolAverageFeeRate: (s: CommonState, federationId?: Federation["id"]) => number | null;
export declare const selectStabilityPoolAvailableLiquidity: (s: CommonState, federationId?: Federation["id"]) => MSats | null;
export {};
