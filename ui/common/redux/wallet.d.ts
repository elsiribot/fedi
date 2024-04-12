import { PayloadAction } from '@reduxjs/toolkit';
import { TFunction } from 'i18next';
import { CommonState } from '.';
import { Federation, MSats, UsdCents } from '../types';
import { RpcAmount, RpcStabilityPoolAccountInfo, StabilityPoolDepositEvent, StabilityPoolWithdrawalEvent } from '../types/bindings';
import { FedimintBridge } from '../utils/fedimint';
type FederationPayloadAction<T = object> = PayloadAction<{
    federationId: string;
} & T>;
declare const initialState: Record<string, {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
    cycleStartPrice: number | null;
} | undefined>;
export type WalletState = typeof initialState;
export declare const walletSlice: import("@reduxjs/toolkit").Slice<Record<string, {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
    cycleStartPrice: number | null;
} | undefined>, {
    setStabilityPoolAccountInfo(state: import("immer/dist/internal").WritableDraft<Record<string, {
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
        cycleStartPrice: number | null;
    } | undefined>>, action: {
        payload: {
            federationId: string;
        } & {
            stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo;
        };
        type: string;
    }): void;
    resetFederationWalletState(state: import("immer/dist/internal").WritableDraft<Record<string, {
        stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
        cycleStartPrice: number | null;
    } | undefined>>, action: FederationPayloadAction): void;
    resetWalletState(): {
        [x: string]: {
            stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo | null;
            cycleStartPrice: number | null;
        } | undefined;
    };
}, "wallet">;
/*** Basic actions ***/
export declare const setStabilityPoolAccountInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    stabilityPoolAccountInfo: RpcStabilityPoolAccountInfo;
}, "wallet/setStabilityPoolAccountInfo">, resetFederationWalletState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & object, "wallet/resetFederationWalletState">, resetWalletState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"wallet/resetWalletState">;
/*** Async thunk actions ***/
export declare const fetchStabilityPoolAccountInfo: import("@reduxjs/toolkit").AsyncThunk<RpcStabilityPoolAccountInfo, {
    fedimint: FedimintBridge;
    federationId: string;
}, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
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
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
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
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
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
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
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
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
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
export declare const selectTotalLockedMsats: ((state: CommonState) => 0 | MSats) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null) => (0 | MSats) & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total amount locked in deposits in cents
 * */
export declare const selectTotalLockedCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: number) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total amount locked in deposits, converted to the selectedCurrency
 * */
export declare const selectTotalLockedFiat: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number & {
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
export declare const selectTotalStagedCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: MSats, args_1: number) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the USD value of pending deposits to selectedCurrency
 * */
export declare const selectTotalStagedFiat: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Calculates the total stable balance in cents
 * */
export declare const selectStableBalanceCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: UsdCents) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the total stable balance in cents to the selectedCurrency
 * */
export declare const selectStableBalance: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number & {
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
export declare const selectStableBalancePendingCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: RpcStabilityPoolAccountInfo | null, args_1: UsdCents, args_2: UsdCents) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Converts the pending stable balance in cents to the selectedCurrency
 * */
export declare const selectStableBalancePending: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number, args_2: number) => number & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectWithdrawableStableBalanceCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: UsdCents) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumWithdrawAmountCents: ((state: CommonState) => UsdCents) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null, args_1: UsdCents, args_2: UsdCents) => number & {
    _: "UsdCents";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectWithdrawableStableBalanceMsats: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number) => number & {
    _: "MSats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumWithdrawAmountMsats: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: UsdCents, args_1: number) => number & {
    _: "MSats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMinimumDepositAmount: ((state: CommonState) => import("../types").Sats) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Get the deposit time from stabilitypool cycle duration in human-readable format
 * */
export declare const selectFormattedDepositTime: ((state: CommonState, t: TFunction<"translation", undefined>) => string | 0) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null, args_1: TFunction<"translation", undefined>) => (string | 0) & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Get the max APR from the max allowed fee rate in parts per billion
 * This calculates what % of a deposit the user can expect to pay in fees
 * after 1 full year, deducting fees every 10 minutes compounding every cycle
 */
export declare const selectMaximumAPR: ((state: CommonState) => number) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcStabilityPoolConfig | null) => number & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStabilityPoolCycleStartPrice: (s: CommonState, federationId?: Federation['id']) => number | null;
export {};
