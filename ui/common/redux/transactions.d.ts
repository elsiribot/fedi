import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, Transaction } from '../types';
import { FedimintBridge } from '../utils/fedimint';
type FederationPayloadAction<T = object> = PayloadAction<{
    federationId: string;
} & T>;
/*** Initial State ***/
declare const initialTransactionsState: {
    transactions: Transaction[];
};
type FederationTransactionsState = typeof initialTransactionsState;
declare const initialState: Record<Federation["id"], FederationTransactionsState | undefined>;
export type TransactionsState = typeof initialState;
export declare const transactionsSlice: import("@reduxjs/toolkit").Slice<Record<string, {
    transactions: Transaction[];
} | undefined>, {
    addTransaction(state: import("immer/dist/internal").WritableDraft<Record<string, {
        transactions: Transaction[];
    } | undefined>>, action: FederationPayloadAction<{
        transaction: Transaction;
    }>): {
        [x: string]: import("immer/dist/internal").WritableDraft<{
            transactions: Transaction[];
        }> | {
            transactions: import("../types/bindings").RpcTransaction[];
        } | undefined;
    };
}, "transactions">;
/*** Basic actions ***/
export declare const addTransaction: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: string;
} & {
    transaction: Transaction;
}, "transactions/addTransaction">;
/*** Async thunk actions ***/
export declare const fetchTransactions: import("@reduxjs/toolkit").AsyncThunk<import("../types/bindings").RpcTransaction[], {
    fedimint: FedimintBridge;
    federationId: string;
    limit?: number;
    more?: boolean;
    refresh?: boolean;
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
export declare const updateTransactionNotes: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
    transactionId: string;
    notes: string;
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
/*** Selectors ***/
export declare const selectTransactions: (s: CommonState, federationId?: Federation["id"]) => import("../types/bindings").RpcTransaction[];
export declare const selectStabilityTransactionHistory: ((state: CommonState, federationId?: string | undefined) => import("../types/bindings").RpcTransaction[]) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcTransaction[]) => import("../types/bindings").RpcTransaction[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
