import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { SocialRecoveryEvent } from '../types';
import { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    hasCheckedForSocialRecovery: boolean;
    socialRecoveryQr: string | null;
    socialRecoveryState: SocialRecoveryEvent | null;
};
export type RecoveryState = typeof initialState;
/*** Slice definition ***/
export declare const recoverySlice: import("@reduxjs/toolkit").Slice<{
    hasCheckedForSocialRecovery: boolean;
    socialRecoveryQr: string | null;
    socialRecoveryState: SocialRecoveryEvent | null;
}, {
    setSocialRecoveryState(state: import("immer/dist/internal").WritableDraft<{
        hasCheckedForSocialRecovery: boolean;
        socialRecoveryQr: string | null;
        socialRecoveryState: SocialRecoveryEvent | null;
    }>, action: PayloadAction<RecoveryState['socialRecoveryState']>): void;
}, "recovery">;
/*** Basic actions ***/
export declare const setSocialRecoveryState: import("@reduxjs/toolkit").ActionCreatorWithPayload<SocialRecoveryEvent | null, "recovery/setSocialRecoveryState">;
/*** Async thunk actions ***/
export declare const fetchSocialRecovery: import("@reduxjs/toolkit").AsyncThunk<void | {
    qr: string;
    state: SocialRecoveryEvent;
}, FedimintBridge, {
    state?: unknown;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refreshSocialRecoveryState: import("@reduxjs/toolkit").AsyncThunk<SocialRecoveryEvent, FedimintBridge, {
    state?: unknown;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const completeSocialRecovery: import("@reduxjs/toolkit").AsyncThunk<void, {
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
export declare const cancelSocialRecovery: import("@reduxjs/toolkit").AsyncThunk<void, FedimintBridge, {
    state?: unknown;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
/*** Selectors ***/
export declare const selectHasCheckedForSocialRecovery: (s: CommonState) => boolean;
export declare const selectSocialRecoveryQr: (s: CommonState) => string | null;
export declare const selectSocialRecoveryState: (s: CommonState) => SocialRecoveryEvent | null;
export {};
