import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, Guardian, MSats, PublicFederation, Sats, FediMod, MatrixRoom, FederationListItem, ClientConfigMetadata, Network } from '../types';
import { RpcJsonClientConfig, RpcStabilityPoolConfig } from '../types/bindings';
import type { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    federations: FederationListItem[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<string, ClientConfigMetadata | undefined>;
    customFediMods: Record<string, FediMod[] | undefined>;
    defaultCommunityChats: Record<string, MatrixRoom[]>;
};
export type FederationState = typeof initialState;
/*** Slice definition ***/
export declare const federationSlice: import("@reduxjs/toolkit").Slice<{
    federations: FederationListItem[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<string, ClientConfigMetadata | undefined>;
    customFediMods: Record<string, FediMod[] | undefined>;
    defaultCommunityChats: Record<string, MatrixRoom[]>;
}, {
    setFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<FederationListItem[]>): void;
    setPublicFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<PublicFederation[]>): void;
    updateFederation(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<Partial<FederationListItem>>): void;
    updateFederationBalance(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            balance: Federation['balance'];
        };
        type: string;
    }): void;
    setActiveFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<string | null>): void;
    setPayFromFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<string | null>): void;
    updateExternalMeta(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<FederationState['externalMeta']>): void;
    setFederationExternalMeta(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            meta: ClientConfigMetadata | undefined;
        };
        type: string;
    }): void;
    changeAuthenticatedGuardian(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: PayloadAction<Guardian | null>): void;
    removeCustomFediMod(state: import("immer/dist/internal").WritableDraft<{
        federations: FederationListItem[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, ClientConfigMetadata | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
        defaultCommunityChats: Record<string, MatrixRoom[]>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            fediModId: FediMod['id'];
        };
        type: string;
    }): void;
}, "federation">;
/*** Basic actions ***/
export declare const setFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<FederationListItem[], "federation/setFederations">, setPublicFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<PublicFederation[], "federation/setPublicFederations">, updateFederation: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<FederationListItem>, "federation/updateFederation">, updateFederationBalance: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    balance: Federation['balance'];
}, "federation/updateFederationBalance">, setActiveFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setActiveFederationId">, setPayFromFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setPayFromFederationId">, updateExternalMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, ClientConfigMetadata | undefined>, "federation/updateExternalMeta">, setFederationExternalMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    meta: ClientConfigMetadata | undefined;
}, "federation/setFederationExternalMeta">, changeAuthenticatedGuardian: import("@reduxjs/toolkit").ActionCreatorWithPayload<Guardian | null, "federation/changeAuthenticatedGuardian">, removeCustomFediMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    fediModId: FediMod['id'];
}, "federation/removeCustomFediMod">;
/*** Async thunk actions */
export declare const refreshFederations: import("@reduxjs/toolkit").AsyncThunk<FederationListItem[], FedimintBridge, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const joinFederation: import("@reduxjs/toolkit").AsyncThunk<FederationListItem, {
    fedimint: FedimintBridge;
    code: string;
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
export declare const leaveFederation: import("@reduxjs/toolkit").AsyncThunk<void, {
    fedimint: FedimintBridge;
    federationId: string;
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
export declare const selectWalletFederations: ((state: CommonState) => Federation[]) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[], args_1: Record<string, ClientConfigMetadata | undefined>) => Federation[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederations: ((state: CommonState) => FederationListItem[]) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[], args_1: Record<string, ClientConfigMetadata | undefined>) => FederationListItem[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAlphabeticallySortedFederations: ((state: CommonState) => FederationListItem[]) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[]) => FederationListItem[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationIds: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[]) => string[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectActiveFederation: ((state: CommonState) => FederationListItem | undefined) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[], args_1: string | null) => (FederationListItem | undefined) & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederation: (s: CommonState, id: string) => FederationListItem | undefined;
export declare const selectActiveFederationId: (s: CommonState) => string | undefined;
export declare const selectPaymentFederation: ((state: CommonState) => Federation | undefined) & import("reselect").OutputSelectorFields<(args_0: Federation[], args_1: FederationListItem | undefined, args_2: string | null) => Omit<import("../types/bindings").RpcFederation, "network" | "meta"> & {
    meta: ClientConfigMetadata;
    network: Network;
    readonly hasWallet: true;
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationClientConfig: ((state: CommonState) => RpcJsonClientConfig | null) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => RpcJsonClientConfig & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationStabilityPoolConfig: ((state: CommonState) => RpcStabilityPoolConfig | null) & import("reselect").OutputSelectorFields<(args_0: RpcJsonClientConfig | null) => RpcStabilityPoolConfig & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcFediFeeSchedule | null) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => import("../types/bindings").RpcFediFeeSchedule & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectEcashFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcFediFeeSchedule | null) => import("../types/bindings").RpcModuleFediFeeSchedule & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectStabilityPoolFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcModuleFediFeeSchedule | null | undefined) & import("reselect").OutputSelectorFields<(args_0: import("../types/bindings").RpcFediFeeSchedule | null) => import("../types/bindings").RpcModuleFediFeeSchedule & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationMetadata: ((state: CommonState) => ClientConfigMetadata) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => ClientConfigMetadata & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectGlobalCommunityMeta: ((state: CommonState) => ClientConfigMetadata | undefined) & import("reselect").OutputSelectorFields<(args_0: Record<string, ClientConfigMetadata | undefined>) => ClientConfigMetadata & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationBalance: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => number & {
    _: "MSats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectPaymentFederationBalance: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => number & {
    _: "MSats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsActiveFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationHasWallet: (federation: FederationListItem) => boolean;
export declare const selectActiveFederationHasWallet: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsAnyFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: FederationListItem[]) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationCustomFediMods: (s: CommonState, federationId: Federation['id']) => FediMod[];
export declare const selectActiveFederationCustomFediMods: (s: CommonState) => FediMod[];
export declare const selectActiveFederationChats: (s: CommonState) => MatrixRoom[];
export declare const selectMaxStableBalanceSats: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxInvoiceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxBalanceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectReceivesDisabled: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: Sats, args_1: Sats, args_2: MSats) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectActiveFederationFediMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: FederationListItem | undefined, args_1: FediMod[]) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationGroupChats: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => string[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationWelcomeMessage: ((state: CommonState) => string | null) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => string & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationPinnedMessage: ((state: CommonState) => string | null) & import("reselect").OutputSelectorFields<(args_0: ClientConfigMetadata) => string & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
