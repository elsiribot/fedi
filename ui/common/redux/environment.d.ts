import { PayloadAction } from '@reduxjs/toolkit';
import type { i18n } from 'i18next';
import { CommonState } from '.';
/*** Initial State ***/
declare const initialState: {
    developerMode: boolean;
    fedimodDebugMode: boolean;
    onchainDepositsEnabled: boolean;
    stableBalanceEnabled: boolean;
    language: string | null;
    amountInputType: "fiat" | "sats" | undefined;
    showFiatTxnAmounts: boolean;
    deviceId: string | undefined;
};
export type EnvironmentState = typeof initialState;
/*** Slice definition ***/
export declare const environmentSlice: import("@reduxjs/toolkit").Slice<{
    developerMode: boolean;
    fedimodDebugMode: boolean;
    onchainDepositsEnabled: boolean;
    stableBalanceEnabled: boolean;
    language: string | null;
    amountInputType: "fiat" | "sats" | undefined;
    showFiatTxnAmounts: boolean;
    deviceId: string | undefined;
}, {
    setDeveloperMode(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setFediModDebugMode(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setAmountInputType(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<EnvironmentState['amountInputType']>): void;
    setOnchainDepositsEnabled(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setStableBalanceEnabled(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setShowFiatTxnAmounts(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<boolean>): void;
    setDeviceId(state: import("immer/dist/internal").WritableDraft<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>, action: PayloadAction<string>): void;
}, "environment">;
/*** Basic actions ***/
export declare const setDeveloperMode: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setDeveloperMode">, setFediModDebugMode: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setFediModDebugMode">, setAmountInputType: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<"fiat" | "sats" | undefined, "environment/setAmountInputType">, setOnchainDepositsEnabled: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setOnchainDepositsEnabled">, setStableBalanceEnabled: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setStableBalanceEnabled">, setShowFiatTxnAmounts: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "environment/setShowFiatTxnAmounts">, setDeviceId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "environment/setDeviceId">;
/*** Async thunk actions ***/
export declare const changeLanguage: import("@reduxjs/toolkit").AsyncThunk<void, {
    language: string;
    i18n: i18n;
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
export declare const initializeDeviceId: import("@reduxjs/toolkit").AsyncThunk<void, {
    getDeviceId: () => string;
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
/*** Selectors ***/
export declare const selectDeveloperMode: (s: CommonState) => boolean;
export declare const selectFediModDebugMode: (s: CommonState) => boolean;
export declare const selectOnchainDepositsEnabled: (s: CommonState) => boolean;
export declare const selectLanguage: (s: CommonState) => string | null;
export declare const selectAmountInputType: (s: CommonState) => "fiat" | "sats" | undefined;
export declare const selectStableBalanceEnabled: (s: CommonState) => boolean;
export declare const selectShowFiatTxnAmounts: (s: CommonState) => boolean;
export declare const selectDeviceId: (s: CommonState) => string | undefined;
export {};
