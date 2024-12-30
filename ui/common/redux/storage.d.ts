import { CommonState } from '.';
import type { StorageApi } from '../types';
/*** Initial State ***/
declare const initialState: {
    hasLoaded: boolean;
    lastSavedAt: number;
};
export type EnvironmentState = typeof initialState;
/*** Slice definition ***/
export declare const storageSlice: import("@reduxjs/toolkit").Slice<{
    hasLoaded: boolean;
    lastSavedAt: number;
}, {}, "storage">;
/*** Basic actions ***/
/*** Async thunk actions ***/
export declare const loadFromStorage: import("@reduxjs/toolkit").AsyncThunk<import("../types").StoredStateV22 | null, {
    storage: StorageApi;
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
export declare const saveToStorage: import("@reduxjs/toolkit").AsyncThunk<void, {
    storage: StorageApi;
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
/*** Selectors ***/
export declare const selectHasLoadedFromStorage: (s: CommonState) => boolean;
export {};
