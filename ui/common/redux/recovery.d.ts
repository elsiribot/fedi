import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { SocialRecoveryEvent } from '../types';
import { RpcDeviceIndexAssignmentStatus, RpcFederation, RpcRegisteredDevice } from '../types/bindings';
import { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    hasCheckedForSocialRecovery: boolean;
    socialRecoveryQr: string | null;
    socialRecoveryState: SocialRecoveryEvent | null;
    registeredDevices: RpcRegisteredDevice[];
    deviceIndexRequired: boolean;
    shouldLockDevice: boolean;
};
export type RecoveryState = typeof initialState;
/*** Slice definition ***/
export declare const recoverySlice: import("@reduxjs/toolkit").Slice<{
    hasCheckedForSocialRecovery: boolean;
    socialRecoveryQr: string | null;
    socialRecoveryState: SocialRecoveryEvent | null;
    registeredDevices: RpcRegisteredDevice[];
    deviceIndexRequired: boolean;
    shouldLockDevice: boolean;
}, {
    setSocialRecoveryState(state: import("immer/dist/internal").WritableDraft<{
        hasCheckedForSocialRecovery: boolean;
        socialRecoveryQr: string | null;
        socialRecoveryState: SocialRecoveryEvent | null;
        registeredDevices: RpcRegisteredDevice[];
        deviceIndexRequired: boolean;
        shouldLockDevice: boolean;
    }>, action: PayloadAction<RecoveryState['socialRecoveryState']>): void;
    setDeviceIndexRequired(state: import("immer/dist/internal").WritableDraft<{
        hasCheckedForSocialRecovery: boolean;
        socialRecoveryQr: string | null;
        socialRecoveryState: SocialRecoveryEvent | null;
        registeredDevices: RpcRegisteredDevice[];
        deviceIndexRequired: boolean;
        shouldLockDevice: boolean;
    }>, action: PayloadAction<boolean>): void;
    setShouldLockDevice(state: import("immer/dist/internal").WritableDraft<{
        hasCheckedForSocialRecovery: boolean;
        socialRecoveryQr: string | null;
        socialRecoveryState: SocialRecoveryEvent | null;
        registeredDevices: RpcRegisteredDevice[];
        deviceIndexRequired: boolean;
        shouldLockDevice: boolean;
    }>, action: PayloadAction<boolean>): void;
}, "recovery">;
/*** Basic actions ***/
export declare const setSocialRecoveryState: import("@reduxjs/toolkit").ActionCreatorWithPayload<SocialRecoveryEvent | null, "recovery/setSocialRecoveryState">, setDeviceIndexRequired: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "recovery/setDeviceIndexRequired">, setShouldLockDevice: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "recovery/setShouldLockDevice">;
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
export declare const recoverFromMnemonic: import("@reduxjs/toolkit").AsyncThunk<RpcRegisteredDevice[], {
    fedimint: FedimintBridge;
    mnemonic: string[];
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
export declare const createNewWallet: import("@reduxjs/toolkit").AsyncThunk<RpcFederation | null, {
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
export declare const transferExistingWallet: import("@reduxjs/toolkit").AsyncThunk<RpcFederation | null, {
    fedimint: FedimintBridge;
    device: RpcRegisteredDevice;
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
export declare const fetchDeviceIndexAssignmentStatus: import("@reduxjs/toolkit").AsyncThunk<RpcDeviceIndexAssignmentStatus, FedimintBridge, {
    state?: unknown;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const fetchRegisteredDevices: import("@reduxjs/toolkit").AsyncThunk<RpcRegisteredDevice[], FedimintBridge, {
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
export declare const selectRegisteredDevices: (s: CommonState) => RpcRegisteredDevice[];
export {};
