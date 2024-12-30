import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, FederationListItem, FederationMetadata, FediMod, Guardian, LoadedFederation, MatrixRoom, MSats, PublicFederation, Sats } from '../types';
import { RpcJsonClientConfig, RpcStabilityPoolConfig } from '../types/bindings';
import type { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    federations: FederationListItem[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
    customFediMods: Record<Federation["id"], FediMod[] | undefined>;
    defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
};
export type FederationState = typeof initialState;
/*** Slice definition ***/
export declare const federationSlice: import("@reduxjs/toolkit").Slice<{
    federations: FederationListItem[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
    customFediMods: Record<Federation["id"], FediMod[] | undefined>;
    defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
}, {
    setFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<FederationListItem[]>): void;
    setPublicFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<PublicFederation[]>): void;
    upsertFederation(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<FederationListItem>): void;
    updateFederationBalance(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<{
        federationId: Federation["id"];
        balance: LoadedFederation["balance"];
    }>): void;
    setActiveFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<string | null>): void;
    setPayFromFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<string | null>): void;
    setFederationCustomFediMods(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<{
        federationId: Federation["id"];
        mods: FediMod[] | undefined;
    }>): void;
    setFederationExternalMeta(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<{
        federationId: Federation["id"];
        meta: FederationMetadata | undefined;
    }>): void;
    changeAuthenticatedGuardian(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<Guardian | null>): void;
    removeCustomFediMod(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<Federation["id"], FederationMetadata | undefined>;
        customFediMods: Record<Federation["id"], FediMod[] | undefined>;
        defaultCommunityChats: Record<Federation["id"], MatrixRoom[]>;
    }>, action: PayloadAction<{
        federationId: Federation["id"];
        fediModId: FediMod["id"];
    }>): void;
}, "federation">;
/*** Basic actions ***/
export declare const setFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<(({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community)[], "federation/setFederations">, setPublicFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<PublicFederation[], "federation/setPublicFederations">, upsertFederation: import("@reduxjs/toolkit").ActionCreatorWithPayload<({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community, "federation/upsertFederation">, updateFederationBalance: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation["id"];
    balance: LoadedFederation["balance"];
}, "federation/updateFederationBalance">, setActiveFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setActiveFederationId">, setPayFromFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setPayFromFederationId">, setFederationCustomFediMods: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation["id"];
    mods: FediMod[] | undefined;
}, "federation/setFederationCustomFediMods">, setFederationExternalMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation["id"];
    meta: FederationMetadata | undefined;
}, "federation/setFederationExternalMeta">, changeAuthenticatedGuardian: import("@reduxjs/toolkit").ActionCreatorWithPayload<Guardian | null, "federation/changeAuthenticatedGuardian">, removeCustomFediMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation["id"];
    fediModId: FediMod["id"];
}, "federation/removeCustomFediMod">;
/*** Async thunk actions */
export declare const refreshFederations: import("@reduxjs/toolkit").AsyncThunk<(({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community)[], FedimintBridge, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const refreshGuardianStatuses: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federation: LoadedFederation;
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
export declare const processFederationMeta: import("@reduxjs/toolkit").AsyncThunk<void, {
    federation: Pick<FederationListItem, "id" | "meta">;
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
export declare const joinFederation: import("@reduxjs/toolkit").AsyncThunk<({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community, {
    fedimint: FedimintBridge;
    code: string;
    recoverFromScratch?: boolean;
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
export declare const leaveFederation: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
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
export declare const listGateways: import("@reduxjs/toolkit").AsyncThunk<{
    nodePubKey: string;
    gatewayId: string;
    api: string;
    active: boolean;
}[], {
    fedimint: FedimintBridge;
    federationId: string;
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
export declare const selectLoadedFederations: ((state: CommonState) => LoadedFederation[]) & import("reselect").OutputSelectorFields<(args_0: (({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community)[]) => LoadedFederation[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectWalletFederations: ((state: CommonState) => {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
}[]) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation[]) => {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
}[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederations: ((state: CommonState) => ({
    name: string;
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
    meta?: never;
    hasWallet: true;
} | {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
} | {
    name: string;
    inviteCode: string;
    version: number;
    meta: { [key in string]?: string; };
    id: Federation["id"];
    status: "online";
    network: undefined;
    hasWallet: false;
    init_state: "ready";
})[]) & import("reselect").OutputSelectorFields<(args_0: (({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community)[]) => ({
    name: string;
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
    meta?: never;
    hasWallet: true;
} | {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
} | {
    name: string;
    inviteCode: string;
    version: number;
    meta: { [key in string]?: string; };
    id: Federation["id"];
    status: "online";
    network: undefined;
    hasWallet: false;
    init_state: "ready";
})[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAlphabeticallySortedFederations: ((state: CommonState) => LoadedFederation[]) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation[]) => LoadedFederation[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationIds: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: ({
    name: string;
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
    meta?: never;
    hasWallet: true;
} | {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
} | {
    name: string;
    inviteCode: string;
    version: number;
    meta: { [key in string]?: string; };
    id: Federation["id"];
    status: "online";
    network: undefined;
    hasWallet: false;
    init_state: "ready";
})[]) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectActiveFederation: ((state: CommonState) => LoadedFederation | undefined) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation[], args_1: string | null) => LoadedFederation | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectShouldShowDegradedStatus: ((state: CommonState, federation: ({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community | undefined) => boolean) & import("reselect").OutputSelectorFields<(args_0: boolean, args_1: ({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation | import("../types").Community | undefined) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederation: (s: CommonState, id: string) => {
    name: string;
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
    meta?: never;
    hasWallet: true;
} | {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
} | {
    name: string;
    inviteCode: string;
    version: number;
    meta: { [key in string]?: string; };
    id: Federation["id"];
    status: "online";
    network: undefined;
    hasWallet: false;
    init_state: "ready";
} | undefined;
export declare const selectLoadedFederation: (s: CommonState, id: string) => LoadedFederation | undefined;
export declare const selectActiveFederationId: (s: CommonState) => string | undefined;
export declare const selectReusedEcashFederations: ((state: CommonState) => LoadedFederation[]) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation[]) => LoadedFederation[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectPaymentFederation: ((state: CommonState) => LoadedFederation | undefined) & import("reselect").OutputSelectorFields<(args_0: {
    name: string;
    balance: import("../types/bindings").RpcAmount;
    id: import("../types/bindings").RpcFederationId;
    network: import("../types/bindings").RpcBitcoinNetwork | null;
    inviteCode: string;
    meta: { [key in string]?: string; };
    recovering: boolean;
    nodes: Record<string, {
        url: string;
        name: string;
    }>;
    version: number;
    clientConfig: RpcJsonClientConfig | null;
    fediFeeSchedule: import("../types/bindings").RpcFediFeeSchedule;
    hadReusedEcash: boolean;
    status: import("../types").FederationStatus;
    init_state: "ready";
    hasWallet: true;
}[], args_1: LoadedFederation | undefined, args_2: string | null) => LoadedFederation | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationClientConfig: ((state: CommonState) => RpcJsonClientConfig | null) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => RpcJsonClientConfig | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationStabilityPoolConfig: ((state: CommonState) => RpcStabilityPoolConfig | null) & import("reselect").OutputSelectorFields<(args_0: RpcJsonClientConfig | null) => RpcStabilityPoolConfig | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcFediFeeSchedule | null) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => import("../types/bindings").RpcFediFeeSchedule | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectEcashFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcFediFeeSchedule | null) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStabilityPoolFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcFediFeeSchedule | null) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationMetadata: ((state: CommonState) => {
    [x: string]: string | undefined;
}) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => {
    [x: string]: string | undefined;
}, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectGlobalCommunityMeta: ((state: CommonState) => {
    [x: string]: string | undefined;
} | undefined) & import("reselect").OutputSelectorFields<(args_0: Record<string, {
    [x: string]: string | undefined;
} | undefined>) => {
    [x: string]: string | undefined;
} | undefined, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationBalance: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => MSats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectPaymentFederationBalance: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => MSats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsActiveFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationHasWallet: (federation: FederationListItem) => federation is ({
    init_state: "loading";
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "loading";
    readonly hasWallet: true;
}) | ({
    init_state: "failed";
    error: import("../types/bindings").RpcError;
    id: import("../types/bindings").RpcFederationId;
} & {
    meta?: never;
    readonly init_state: "failed";
    readonly hasWallet: true;
}) | LoadedFederation;
export declare const selectActiveFederationHasWallet: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation | undefined) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsAnyFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: LoadedFederation[]) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationCustomFediMods: (s: CommonState, federationId: Federation["id"]) => FediMod[];
export declare const selectActiveFederationCustomFediMods: (s: CommonState) => FediMod[];
export declare const selectActiveFederationChats: (s: CommonState) => MatrixRoom[];
export declare const selectMaxStableBalanceSats: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => Sats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxInvoiceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => Sats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxBalanceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => Sats, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectReceivesDisabled: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: Sats, args_1: Sats, args_2: MSats) => boolean, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectActiveFederationFediMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: string | null, args_1: Record<string, FediMod[] | undefined>) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectCommunityMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, FediMod[] | undefined>) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationFediModsById: (state: CommonState, federationId: string) => FediMod[];
export declare const selectFederationGroupChats: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => string[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationWelcomeMessage: ((state: CommonState) => string | null) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => string | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationPinnedMessage: ((state: CommonState) => string | null) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
}) => string | null, {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
