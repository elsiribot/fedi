import { RequestInvoiceArgs } from 'webln';
import { ParsedLnurlAuth, ParsedLnurlPay, ParsedLnurlWithdraw, Invoice, EcashRequest } from '@fedi/common/types';
import { UnsignedNostrEvent } from '@fedi/injections/src/injectables/nostr/types';
import { CommonState } from '.';
type SiteInfo = {
    icon: string;
    title: string;
    url: string;
};
declare const initialState: {
    siteInfo: SiteInfo | null;
    requestInvoiceArgs: RequestInvoiceArgs | null;
    invoiceToPay: Invoice | null;
    lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
    lnurlPayment: ParsedLnurlPay["data"] | null;
    lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
    nostrUnsignedEvent: UnsignedNostrEvent | null;
    ecashRequest: EcashRequest | null;
    addressOverlayOpen: boolean;
};
export type BrowserState = typeof initialState;
export declare const browserSlice: import("@reduxjs/toolkit").Slice<{
    siteInfo: SiteInfo | null;
    requestInvoiceArgs: RequestInvoiceArgs | null;
    invoiceToPay: Invoice | null;
    lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
    lnurlPayment: ParsedLnurlPay["data"] | null;
    lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
    nostrUnsignedEvent: UnsignedNostrEvent | null;
    ecashRequest: EcashRequest | null;
    addressOverlayOpen: boolean;
}, {
    setSiteInfo(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setAddressOverlayOpen(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setRequestInvoiceArgs(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setInvoiceToPay(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setLnurlWithdrawal(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setLnurlPayment(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setLnurlAuthRequest(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setNostrUnsignedEvent(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    setEcashRequest(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>, action: {
        payload: any;
        type: string;
    }): void;
    resetBrowserOverlayState(state: import("immer/dist/internal").WritableDraft<{
        siteInfo: SiteInfo | null;
        requestInvoiceArgs: RequestInvoiceArgs | null;
        invoiceToPay: Invoice | null;
        lnurlWithdrawal: ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: UnsignedNostrEvent | null;
        ecashRequest: EcashRequest | null;
        addressOverlayOpen: boolean;
    }>): void;
}, "browser">;
export declare const setSiteInfo: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setSiteInfo">, setRequestInvoiceArgs: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setRequestInvoiceArgs">, setInvoiceToPay: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setInvoiceToPay">, setLnurlWithdrawal: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setLnurlWithdrawal">, setLnurlPayment: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setLnurlPayment">, setLnurlAuthRequest: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setLnurlAuthRequest">, setNostrUnsignedEvent: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setNostrUnsignedEvent">, setEcashRequest: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setEcashRequest">, resetBrowserOverlayState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"browser/resetBrowserOverlayState">, setAddressOverlayOpen: import("@reduxjs/toolkit").ActionCreatorWithPayload<any, "browser/setAddressOverlayOpen">;
/*** Async thunks ***/
export declare const refetchSiteInfo: import("@reduxjs/toolkit").AsyncThunk<void, {
    url: string;
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
export declare const selectSiteInfo: (s: CommonState) => SiteInfo | null;
export declare const selectRequestInvoiceArgs: (s: CommonState) => RequestInvoiceArgs | null;
export declare const selectInvoiceToPay: (s: CommonState) => Invoice | null;
export declare const selectLnurlWithdrawal: (s: CommonState) => {
    domain: string;
    callback: string;
    k1: string;
    defaultDescription?: string;
    minWithdrawable?: import("@fedi/common/types").MSats;
    maxWithdrawable?: import("@fedi/common/types").MSats;
} | null;
export declare const selectLnurlPayment: (s: CommonState) => {
    domain: string;
    callback: string;
    metadata: string[][];
    description?: string;
    longDescription?: string;
    thumbnail?: string;
    maxSendable?: import("@fedi/common/types").MSats;
    minSendable?: import("@fedi/common/types").MSats;
} | null;
export declare const selectLnurlAuthRequest: (s: CommonState) => {
    domain: string;
    callback: string;
    k1: string;
    action?: "register" | "login" | "link" | "auth";
} | null;
export declare const selectNostrUnsignedEvent: (s: CommonState) => UnsignedNostrEvent | null;
export declare const selectEcashRequest: (s: CommonState) => EcashRequest | null;
export declare const selectAddressOverlayOpen: (s: CommonState) => boolean;
export {};
