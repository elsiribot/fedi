import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, SupportedCurrency } from '../types';
/*** Initial State ***/
declare const initialState: {
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
};
export type CurrencyState = typeof initialState;
/*** Slice definition ***/
export declare const currencySlice: import("@reduxjs/toolkit").Slice<{
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
}, {
    changeSelectedFiatCurrency(state: import("immer/dist/internal").WritableDraft<{
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: SupportedCurrency | null;
    }>, action: PayloadAction<SupportedCurrency>): void;
    resetCurrencyState(): {
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: SupportedCurrency | null;
    };
}, "currency">;
/*** Basic actions ***/
export declare const changeSelectedFiatCurrency: import("@reduxjs/toolkit").ActionCreatorWithPayload<SupportedCurrency, "currency/changeSelectedFiatCurrency">, resetCurrencyState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"currency/resetCurrencyState">;
/*** Async thunk actions ***/
export declare const fetchCurrencyPrices: import("@reduxjs/toolkit").AsyncThunk<Pick<{
    btcUsdRate: number;
    fiatUsdRates: Record<string, number | undefined>;
    selectedFiatCurrency: SupportedCurrency | null;
}, "btcUsdRate" | "fiatUsdRates">, void, {
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
export declare const selectCurrency: (s: CommonState) => SupportedCurrency;
export declare const selectCurrencies: (s: CommonState) => {
    [k: string]: SupportedCurrency;
};
export declare const selectBtcUsdExchangeRate: (s: CommonState, federationId?: Federation['id']) => number;
export declare const selectBtcExchangeRate: (s: CommonState) => number;
export {};
