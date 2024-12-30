import { EnhancedStore } from '@reduxjs/toolkit';
import { CurriedGetDefaultMiddleware } from '@reduxjs/toolkit/dist/getDefaultMiddleware';
import type { i18n as I18n } from 'i18next';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { FederationListItem, StorageApi } from '../types';
import { FedimintBridge } from '../utils/fedimint';
export * from './currency';
export * from './environment';
export * from './federation';
export * from './matrix';
export * from './nux';
export * from './recovery';
export * from './security';
export * from './toast';
export * from './wallet';
export * from './browser';
export declare const commonReducers: {
    currency: import("redux").Reducer<{
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: import("../types").SupportedCurrency | null;
        currencyLocale: string | undefined;
    }>;
    environment: import("redux").Reducer<{
        networkInfo: import("@react-native-community/netinfo").NetInfoState | null;
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "sats" | "fiat" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
        nostrNpub: import("../types/bindings").RpcNostrPubkey | undefined;
        nostrNsec: import("../types/bindings").RpcNostrSecret | undefined;
        fedimintVersion: string | undefined;
    }>;
    federation: import("redux").Reducer<{
        federations: FederationListItem[];
        publicFederations: import("../types").PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: import("../types").Guardian | null;
        externalMeta: Record<import("../types").Federation["id"], import("../types").FederationMetadata | undefined>;
        customFediMods: Record<import("../types").Federation["id"], import("../types").FediMod[] | undefined>;
        defaultCommunityChats: Record<import("../types").Federation["id"], import("../types").MatrixRoom[]>;
    }>;
    matrix: import("redux").Reducer<{
        started: boolean;
        auth: null | import("../types").MatrixAuth;
        status: import("../types").MatrixSyncStatus;
        roomList: import("../types").MatrixRoomListItem[];
        roomInfo: Record<import("../types").MatrixRoom["id"], import("../types").MatrixRoom | undefined>;
        roomMembers: Record<import("../types").MatrixRoom["id"], import("../types").MatrixRoomMember[] | undefined>;
        roomTimelines: Record<import("../types").MatrixRoom["id"], import("../types").MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<import("../types").MatrixRoom["id"], import("../types").MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<import("../types").MatrixRoom["id"], import("../types/bindings").RpcRoomNotificationMode | undefined>;
        users: Record<import("../types").MatrixUser["id"], import("../types").MatrixUser | undefined>;
        errors: import("../types").MatrixError[];
        pushNotificationToken: string | null;
        groupPreviews: Record<import("../types").MatrixRoom["id"], import("../types").MatrixGroupPreview>;
        drafts: Record<import("../types").MatrixRoom["id"], string>;
        selectedChatMessage: import("../types").MatrixEvent<import("../utils/matrix").MatrixEventContentType<"m.text" | "m.image" | "m.video" | "m.file">> | null;
        messageToEdit: import("../types").MatrixEvent<import("../utils/matrix").MatrixEventContentType<"m.text">> | null;
        previewMedia: Array<{
            visible: boolean;
            media: import("../types").InputMedia;
        }>;
    }>;
    mod: import("redux").Reducer<{
        customGlobalMods: Record<import("../types").FediMod["id"], import("../types").FediMod>;
        modVisibility: Record<import("../types").FediMod["id"], import("./mod").ModVisibility>;
    }>;
    nux: import("redux").Reducer<{
        steps: {
            hasViewedMemberQr: boolean;
            hasOpenedNewChat: boolean;
            hasPerformedPersonalBackup: boolean;
            hasOpenedStabilityPool: boolean;
        };
    }>;
    recovery: import("redux").Reducer<{
        hasCheckedForSocialRecovery: boolean;
        socialRecoveryQr: string | null;
        socialRecoveryState: import("../types").SocialRecoveryEvent | null;
        registeredDevices: import("../types/bindings").RpcRegisteredDevice[];
        deviceIndexRequired: boolean;
        shouldLockDevice: boolean;
    }>;
    storage: import("redux").Reducer<{
        hasLoaded: boolean;
        lastSavedAt: number;
    }>;
    toast: import("redux").Reducer<{
        toast: import("../types").Toast | null;
    }>;
    transactions: import("redux").Reducer<Record<string, {
        transactions: import("../types").Transaction[];
    } | undefined>>;
    wallet: import("redux").Reducer<Record<string, {
        stabilityPoolAccountInfo: import("../types/bindings").RpcStabilityPoolAccountInfo | null;
        stabilityPoolAvailableLiquidity: import("../types").MSats | null;
        cycleStartPrice: number | null;
        averageFeeRate: number | null;
    } | undefined>>;
    security: import("redux").Reducer<import("./security").PinState>;
    browser: import("redux").Reducer<{
        siteInfo: {
            icon: string;
            title: string;
            url: string;
        } | null;
        requestInvoiceArgs: import("webln").RequestInvoiceArgs | null;
        invoiceToPay: import("../types").Invoice | null;
        lnurlWithdrawal: import("../types").ParsedLnurlWithdraw["data"] | null;
        lnurlPayment: import("../types").ParsedLnurlPay["data"] | null;
        lnurlAuthRequest: import("../types").ParsedLnurlAuth["data"] | null;
        nostrUnsignedEvent: import("@fedi/injections/src/injectables/nostr/types").UnsignedNostrEvent | null;
        ecashRequest: import("../types").EcashRequest | null;
        addressOverlayOpen: boolean;
    }>;
};
type CommonReducers = typeof commonReducers;
export type CommonState = {
    [key in keyof CommonReducers]: ReturnType<CommonReducers[key]>;
};
export type CommonDispatch = ThunkDispatch<CommonState, unknown, AnyAction>;
export declare const listenerMiddleware: import("@reduxjs/toolkit").ListenerMiddlewareInstance<CommonState, CommonDispatch, unknown>;
export declare const commonMiddleware: (getDefaultMiddleware: CurriedGetDefaultMiddleware<CommonState>) => import("@reduxjs/toolkit").MiddlewareArray<[import("@reduxjs/toolkit").ListenerMiddleware<CommonState, CommonDispatch, unknown>, import("redux-thunk").ThunkMiddleware<CommonState, AnyAction>]>;
/**
 * Sets up any initial redux behavior that is consistent across all platforms.
 */
export declare function initializeCommonStore({ store: { dispatch, subscribe, getState }, fedimint, storage, i18n, detectLanguage, }: {
    store: EnhancedStore<CommonState, AnyAction, ReturnType<typeof commonMiddleware>>;
    fedimint: FedimintBridge;
    storage: StorageApi;
    i18n: I18n;
    detectLanguage?: () => Promise<string>;
}): () => void;
