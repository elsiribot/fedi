import { TFunction } from 'i18next';
import { RequestInvoiceArgs } from 'webln';
import { EcashRequest, Invoice, MSats, ParsedBip21, ParsedBitcoinAddress, ParsedLnurlPay, ParsedLnurlWithdraw, Sats, SupportedCurrency, UsdCents } from '../types';
import { MeltSummary } from '../utils/cashu';
interface RequestAmountArgs {
    lnurlWithdrawal?: ParsedLnurlWithdraw['data'] | null;
    requestInvoiceArgs?: RequestInvoiceArgs | null;
    ecashRequest?: EcashRequest | null;
}
interface SendAmountArgs {
    btcAddress?: ParsedBitcoinAddress['data'] | null;
    bip21Payment?: ParsedBip21['data'] | null;
    invoice?: Invoice | null;
    lnurlPayment?: ParsedLnurlPay['data'] | null;
    selectedPaymentFederation?: boolean;
    cashuMeltSummary?: MeltSummary | null;
    t?: TFunction;
}
export type FormattedAmounts = {
    formattedFiat: string;
    formattedSats: string;
    formattedUsd: string;
    formattedPrimaryAmount: string;
    formattedSecondaryAmount: string;
};
export type AmountSymbolPosition = 'start' | 'end' | 'none';
export declare const numpadButtons: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "backspace"];
export type NumpadButtonValue = (typeof numpadButtons)[number];
export declare const useBtcFiatPrice: () => {
    convertCentsToFormattedFiat: (cents: UsdCents, symbolPosition?: AmountSymbolPosition) => string;
    convertSatsToFiat: (sats: Sats) => import("../types").Usd;
    convertSatsToFormattedFiat: (sats: Sats, symbolPosition?: AmountSymbolPosition) => string;
    convertSatsToFormattedUsd: (sats: Sats, symbolPosition?: AmountSymbolPosition) => string;
};
export declare const useAmountFormatter: () => {
    makeFormattedAmountsFromMSats: (amount: MSats, symbolPosition?: AmountSymbolPosition) => FormattedAmounts;
    makeFormattedAmountsFromSats: (amount: Sats, symbolPosition?: AmountSymbolPosition) => FormattedAmounts;
};
/**
 * Provides state for rendering a balance amount in fiat and sats.
 */
export declare function useBalance(): {
    satsBalance: Sats;
    formattedBalanceFiat: string;
    formattedBalanceSats: string;
    formattedBalance: string;
};
/**
 * Provides state, callbacks, and misc information for rendering an amount
 * input that allows entry in both fiat and sats.
 */
export declare function useAmountInput(amount: Sats, onChangeAmount?: (amount: Sats) => void, minimumAmount?: Sats | null, maximumAmount?: Sats | null): {
    isFiat: boolean;
    setIsFiat: (value: boolean) => void;
    satsValue: string;
    fiatValue: string;
    handleChangeFiat: (value: string) => void;
    handleChangeSats: (value: string) => void;
    currency: SupportedCurrency;
    currencySymbol: string;
    currencyLocale: string | undefined;
    numpadButtons: readonly [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "backspace"];
    handleNumpadPress: (button: (typeof numpadButtons)[number]) => void;
    validation: {
        readonly i18nKey: "errors.invalid-amount-max";
        readonly amount: Sats;
        readonly fiatValue: import("../types").Usd;
        readonly onlyShowOnSubmit: false;
    } | {
        readonly i18nKey: "errors.invalid-amount-min";
        readonly amount: Sats;
        readonly fiatValue: import("../types").Usd;
        readonly onlyShowOnSubmit: true;
    } | undefined;
};
/**
 * Get the minimum and maximum amount you can receive. Optionally take in an
 * LNURL withdrawal, WebLN invoice request, or ecash request as part of the calculation.
 */
export declare function useMinMaxRequestAmount({ lnurlWithdrawal, requestInvoiceArgs, ecashRequest, }?: RequestAmountArgs): {
    minimumAmount: Sats;
    maximumAmount: Sats;
};
/**
 * Get the minimum and maximum amount you can send. Optionally take in an
 * LNURL pay request as part of the calculation.
 */
export declare function useMinMaxSendAmount({ invoice, lnurlPayment, cashuMeltSummary, selectedPaymentFederation, }?: SendAmountArgs): {
    minimumAmount: Sats;
    maximumAmount: Sats;
};
/**
 * Get the minimum and maximum amount you can withdraw from the stable balance
 */
export declare function useMinMaxWithdrawAmount(): {
    minimumAmount: Sats;
    maximumAmount: Sats;
};
/**
 * Get the minimum and maximum amount you can deposit to the stable balance
 */
export declare function useMinMaxDepositAmount(): {
    minimumAmount: Sats;
    maximumAmount: Sats;
};
/**
 * Provide all the state necessary to implement a request form that generates
 * a Lightning invoice. Optionally provide a set of WebLN requestInvoice args
 * or an LNURL withdrawal.
 */
export declare function useRequestForm(args?: RequestAmountArgs): {
    inputAmount: Sats;
    setInputAmount: import("react").Dispatch<import("react").SetStateAction<Sats>>;
    memo: string;
    setMemo: import("react").Dispatch<import("react").SetStateAction<string>>;
    exactAmount: Sats | undefined;
    minimumAmount: Sats;
    maximumAmount: Sats;
    reset: () => void;
};
/**
 * Provide all the state necessary to implement a pay form that generates
 * a Lightning invoice. Optionally provide an LNURL pay request.
 */
export declare function useSendForm({ btcAddress, bip21Payment, invoice, lnurlPayment, selectedPaymentFederation, cashuMeltSummary, t, }: SendAmountArgs): {
    inputAmount: Sats;
    setInputAmount: import("react").Dispatch<import("react").SetStateAction<Sats>>;
    description: string | undefined;
    sendTo: string | undefined;
    exactAmount: Sats | undefined;
    minimumAmount: Sats;
    maximumAmount: Sats;
    reset: () => void;
};
/**
 * Provide all the state necessary to implement a stabilitypool withdrawal form
 * that decreases the stable USD balance in the wallet
 */
export declare function useWithdrawForm(): {
    inputAmount: Sats;
    setInputAmount: import("react").Dispatch<import("react").SetStateAction<Sats>>;
    minimumAmount: Sats;
    maximumAmount: Sats;
    maximumFiatAmount: string;
};
/**
 * Provide all the state necessary to implement a stabilitypool deposit form
 * that increases the stable USD balance in the wallet
 */
export declare function useDepositForm(): {
    inputAmount: Sats;
    setInputAmount: import("react").Dispatch<import("react").SetStateAction<Sats>>;
    minimumAmount: Sats;
    maximumAmount: Sats;
    maximumFiatAmount: string;
};
/**
 * Provides a string displaying the balance as both fiat and sat.
 */
export declare function useBalanceDisplay(t: TFunction): string;
export {};
