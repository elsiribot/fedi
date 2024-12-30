import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, SupportedCurrency } from '../types';
/*** Initial State ***/
declare const initialState: {
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
    currencyLocale: string | undefined;
};
export type CurrencyState = typeof initialState;
/*** Slice definition ***/
export declare const currencySlice: import("@reduxjs/toolkit").Slice<{
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
    currencyLocale: string | undefined;
}, {
    changeSelectedFiatCurrency(state: import("immer/dist/internal").WritableDraft<{
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: SupportedCurrency | null;
        currencyLocale: string | undefined;
    }>, action: PayloadAction<SupportedCurrency>): void;
    setCurrencyLocale(state: import("immer/dist/internal").WritableDraft<{
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: SupportedCurrency | null;
        currencyLocale: string | undefined;
    }>, action: PayloadAction<string>): void;
    resetCurrencyState(): {
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: SupportedCurrency | null;
        currencyLocale: string | undefined;
    };
}, "currency">;
/*** Basic actions ***/
export declare const changeSelectedFiatCurrency: import("@reduxjs/toolkit").ActionCreatorWithPayload<SupportedCurrency, "currency/changeSelectedFiatCurrency">, setCurrencyLocale: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "currency/setCurrencyLocale">, resetCurrencyState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"currency/resetCurrencyState">;
/*** Async thunk actions ***/
export declare const fetchCurrencyPrices: import("@reduxjs/toolkit").AsyncThunk<Pick<{
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
    currencyLocale: string | undefined;
}, "btcUsdRate" | "fiatUsdRates">, void, {
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
export declare const selectCurrencyLocale: (s: CommonState) => string | undefined;
export declare const selectCurrency: (s: CommonState) => SupportedCurrency;
export declare const selectCurrencies: (s: CommonState) => {
    [k: string]: SupportedCurrency;
};
export declare const selectBtcUsdExchangeRate: (s: CommonState, federationId?: Federation["id"]) => number;
export declare const selectBtcExchangeRate: (s: CommonState) => number;
export {};
