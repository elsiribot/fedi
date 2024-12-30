import { NetInfoState } from '@react-native-community/netinfo';
import { PayloadAction } from '@reduxjs/toolkit';
import type { i18n } from 'i18next';
import { CommonState } from '.';
import { RpcNostrPubkey, RpcNostrSecret } from '../types/bindings';
import { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    networkInfo: NetInfoState | null;
    developerMode: boolean;
    fedimodDebugMode: boolean;
    onchainDepositsEnabled: boolean;
    stableBalanceEnabled: boolean;
    language: string | null;
    amountInputType: "sats" | "fiat" | undefined;
    showFiatTxnAmounts: boolean;
    deviceId: string | undefined;
    nostrNpub: RpcNostrPubkey | undefined;
    nostrNsec: RpcNostrSecret | undefined;
    fedimintVersion: string | undefined;
};
export type EnvironmentState = typeof initialState;
/*** Slice definition ***/
export declare const environmentSlice: import("@reduxjs/toolkit").Slice<{
    networkInfo: NetInfoState | null;
    developerMode: boolean;
    fedimodDebugMode: boolean;
    onchainDepositsEnabled: boolean;
    stableBalanceEnabled: boolean;
    language: string | null;
    amountInputType: "sats" | "fiat" | undefined;
    showFiatTxnAmounts: boolean;
    deviceId: string | undefined;
    nostrNpub: RpcNostrPubkey | undefined;
    nostrNsec: RpcNostrSecret | undefined;
    fedimintVersion: string | undefined;
}, {
    setNetworkInfo(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<NetInfoState>): void;
    setDeveloperMode(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setFediModDebugMode(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setAmountInputType(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<EnvironmentState["amountInputType"]>): void;
    setOnchainDepositsEnabled(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setStableBalanceEnabled(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setShowFiatTxnAmounts(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setDeviceId(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<string>): void;
    setNostrNpub(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<RpcNostrPubkey>): void;
    setNostrNsec(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<RpcNostrSecret>): void;
    setFedimintVersion(state: import("immer/dist/internal").WritableDraft<{
        networkInfo: NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: RpcNostrPubkey | undefined;
        nostrNsec: RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>, action: PayloadAction<string>): void;
}, "environment">;
/*** Basic actions ***/
export declare const setNetworkInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<NetInfoState, "environment/setNetworkInfo">, setDeveloperMode: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setDeveloperMode">, setFediModDebugMode: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setFediModDebugMode">, setAmountInputType: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<"sats" | "fiat" | undefined, "environment/setAmountInputType">, setOnchainDepositsEnabled: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setOnchainDepositsEnabled">, setStableBalanceEnabled: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setStableBalanceEnabled">, setShowFiatTxnAmounts: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setShowFiatTxnAmounts">, setDeviceId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "environment/setDeviceId">, setNostrNpub: import("@reduxjs/toolkit").ActionCreatorWithPayload<RpcNostrPubkey, "environment/setNostrNpub">, setNostrNsec: import("@reduxjs/toolkit").ActionCreatorWithPayload<RpcNostrSecret, "environment/setNostrNsec">, setFedimintVersion: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "environment/setFedimintVersion">;
/*** Async thunk actions ***/
export declare const changeLanguage: import("@reduxjs/toolkit").AsyncThunk<void, {
    language: string;
    i18n: i18n;
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
export declare const initializeDeviceId: import("@reduxjs/toolkit").AsyncThunk<void, {
    getDeviceId: () => string;
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
export declare const initializeNostrKeys: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    forceRefresh?: boolean;
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
export declare const initializeFedimintVersion: import("@reduxjs/toolkit").AsyncThunk<void, {
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
/*** Selectors ***/
export declare const selectNetworkInfo: (s: CommonState) => NetInfoState | null;
export declare const selectIsInternetUnreachable: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: NetInfoState | null) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectDeveloperMode: (s: CommonState) => boolean;
export declare const selectFediModDebugMode: (s: CommonState) => boolean;
export declare const selectOnchainDepositsEnabled: (s: CommonState) => boolean;
export declare const selectLanguage: (s: CommonState) => string | null;
export declare const selectAmountInputType: (s: CommonState) => "sats" | "fiat" | undefined;
export declare const selectStableBalanceEnabled: (s: CommonState) => boolean;
export declare const selectShowFiatTxnAmounts: (s: CommonState) => boolean;
export declare const selectDeviceId: (s: CommonState) => string | undefined;
export declare const selectNostrNpub: (s: CommonState) => RpcNostrPubkey | undefined;
export declare const selectNostrNsec: (s: CommonState) => RpcNostrSecret | undefined;
export declare const selectFedimintVersion: (s: CommonState) => string | undefined;
export {};
