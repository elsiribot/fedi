/// <reference types="xmpp__connection" />
import { EnhancedStore } from '@reduxjs/toolkit';
import { CurriedGetDefaultMiddleware } from '@reduxjs/toolkit/dist/getDefaultMiddleware';
import type { i18n as I18n } from 'i18next';
import type { AnyAction } from 'redux';
import type { ThunkDispatch } from 'redux-thunk';
import { Federation, StorageApi } from '../types';
import { FedimintBridge } from '../utils/fedimint';
export * from './chat';
export * from './currency';
export * from './environment';
export * from './federation';
export * from './matrix';
export * from './nux';
export * from './recovery';
export * from './toast';
export * from './wallet';
export * from './security';
export declare const commonReducers: {
    chat: import("redux").Reducer<Record<string, {
        clientStatus: keyof import("@xmpp/connection").StatusEvents;
        clientLastOnlineAt: number;
        clientError: string | null;
        authenticatedMember: import("../types").ChatMember | null;
        credentials: {
            password: string;
            keypairSeed: string;
            username: string | null;
        } | null;
        messages: import("../types").ChatMessage[];
        groups: import("../types").ChatGroup[];
        groupRoles: Record<string, string | undefined>;
        groupAffiliations: Record<string, string | undefined>;
        membersSeen: import("../types").ChatMember[];
        lastFetchedMessageId: string | null;
        lastReadMessageTimestamps: Record<string, number | undefined>;
        lastSeenMessageTimestamp: number | null;
        encryptionKeys: import("../types").Keypair | null;
        pushNotificationToken: string | null;
        websocketIsHealthy: boolean;
    } | undefined>>;
    currency: import("redux").Reducer<{
        btcUsdRate: number;
        fiatUsdRates: Record<string, number | undefined>;
        selectedFiatCurrency: import("../types").SupportedCurrency | null;
    }>;
    environment: import("redux").Reducer<{
        developerMode: boolean;
        fedimodDebugMode: boolean;
        onchainDepositsEnabled: boolean;
        stableBalanceEnabled: boolean;
        language: string | null;
        amountInputType: "fiat" | "sats" | undefined;
        showFiatTxnAmounts: boolean;
        deviceId: string | undefined;
    }>;
    federation: import("redux").Reducer<{
        federations: Federation[];
        publicFederations: import("../types").PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: import("../types").Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, import("../types").FediMod[] | undefined>;
    }>;
    matrix: import("redux").Reducer<{
        auth: import("../types").MatrixAuth | null;
        status: import("../types").MatrixSyncStatus;
        roomList: import("../types").MatrixRoomListItem[];
        roomInfo: Record<string, import("../types").MatrixRoom | undefined>;
        roomMembers: Record<string, import("../types").MatrixRoomMember[] | undefined>;
        roomTimelines: Record<string, import("../types").MatrixTimelineItem[] | undefined>;
        roomPowerLevels: Record<string, import("../types").MatrixRoomPowerLevels | undefined>;
        roomNotificationMode: Record<string, import("../types/bindings").RpcRoomNotificationMode | undefined>;
        users: Record<string, import("../types").MatrixUser | undefined>;
        errors: Error[];
        pushNotificationToken: string | null;
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
        toast: Required<import("../types").ToastArgs> | null;
    }>;
    transactions: import("redux").Reducer<Record<string, {
        transactions: import("../types/bindings").RpcTransaction[];
    } | undefined>>;
    wallet: import("redux").Reducer<Record<string, {
        stabilityPoolAccountInfo: import("../types/bindings").RpcStabilityPoolAccountInfo | null;
        cycleStartPrice: number | null;
    } | undefined>>;
    security: import("redux").Reducer<import("./security").PinState>;
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
