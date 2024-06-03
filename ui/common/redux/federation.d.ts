/// <reference types="xmpp__connection" />
import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Federation, Guardian, MSats, PublicFederation, Sats, FediMod } from '../types';
import { RpcJsonClientConfig, RpcStabilityPoolConfig } from '../types/bindings';
import type { FedimintBridge } from '../utils/fedimint';
/*** Initial State ***/
declare const initialState: {
    federations: Federation[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
    customFediMods: Record<string, FediMod[] | undefined>;
};
export type FederationState = typeof initialState;
/*** Slice definition ***/
export declare const federationSlice: import("@reduxjs/toolkit").Slice<{
    federations: Federation[];
    publicFederations: PublicFederation[];
    activeFederationId: string | null;
    payFromFederationId: string | null;
    authenticatedGuardian: Guardian | null;
    externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
    customFediMods: Record<string, FediMod[] | undefined>;
}, {
    setFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<Federation[]>): void;
    setPublicFederations(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<PublicFederation[]>): void;
    updateFederation(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<Partial<Federation>>): void;
    updateFederationBalance(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            balance: Federation['balance'];
        };
        type: string;
    }): void;
    setActiveFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<string | null>): void;
    setPayFromFederationId(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<string | null>): void;
    updateExternalMeta(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<FederationState['externalMeta']>): void;
    setFederationExternalMeta(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            meta: Federation['meta'] | undefined;
        };
        type: string;
    }): void;
    changeAuthenticatedGuardian(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: PayloadAction<Guardian | null>): void;
    addCustomFediMod(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            fediMod: FediMod;
        };
        type: string;
    }): void;
    removeCustomFediMod(state: import("immer/dist/internal").WritableDraft<{
        federations: Federation[];
        publicFederations: PublicFederation[];
        activeFederationId: string | null;
        payFromFederationId: string | null;
        authenticatedGuardian: Guardian | null;
        externalMeta: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>;
        customFediMods: Record<string, FediMod[] | undefined>;
    }>, action: {
        payload: {
            federationId: Federation['id'];
            fediModId: FediMod['id'];
        };
        type: string;
    }): void;
}, "federation">;
/*** Basic actions ***/
export declare const setFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<Federation[], "federation/setFederations">, setPublicFederations: import("@reduxjs/toolkit").ActionCreatorWithPayload<PublicFederation[], "federation/setPublicFederations">, updateFederation: import("@reduxjs/toolkit").ActionCreatorWithPayload<Partial<Federation>, "federation/updateFederation">, updateFederationBalance: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    balance: Federation['balance'];
}, "federation/updateFederationBalance">, setActiveFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setActiveFederationId">, setPayFromFederationId: import("@reduxjs/toolkit").ActionCreatorWithPayload<string | null, "federation/setPayFromFederationId">, updateExternalMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>, "federation/updateExternalMeta">, setFederationExternalMeta: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    meta: Federation['meta'] | undefined;
}, "federation/setFederationExternalMeta">, changeAuthenticatedGuardian: import("@reduxjs/toolkit").ActionCreatorWithPayload<Guardian | null, "federation/changeAuthenticatedGuardian">, addCustomFediMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    fediMod: FediMod;
}, "federation/addCustomFediMod">, removeCustomFediMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    federationId: Federation['id'];
    fediModId: FediMod['id'];
}, "federation/removeCustomFediMod">;
/*** Async thunk actions */
export declare const refreshFederations: import("@reduxjs/toolkit").AsyncThunk<Federation[], FedimintBridge, {
    state: CommonState;
    dispatch?: import("redux").Dispatch<import("redux").AnyAction> | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const joinFederation: import("@reduxjs/toolkit").AsyncThunk<Federation, {
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
export declare const selectFederations: ((state: CommonState) => Federation[]) & import("reselect").OutputSelectorFields<(args_0: Federation[], args_1: Record<string, (Record<string, string> & import("../types").ClientConfigMetadata) | undefined>) => Federation[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAlphabeticallySortedFederations: ((state: CommonState) => Federation[]) & import("reselect").OutputSelectorFields<(args_0: Federation[]) => Federation[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationIds: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: Federation[]) => string[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectActiveFederation: ((state: CommonState) => Federation | undefined) & import("reselect").OutputSelectorFields<(args_0: Federation[], args_1: string | null) => Omit<import("../types/bindings").RpcFederation, "network"> & {
    meta: import("../types").ClientConfigMetadata;
    network: import("../types").Network;
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederation: (s: CommonState, id: string) => Federation | undefined;
export declare const selectActiveFederationId: (s: CommonState) => string | undefined;
export declare const selectPayFromFederation: ((state: CommonState) => Federation | undefined) & import("reselect").OutputSelectorFields<(args_0: Federation[], args_1: Federation | undefined, args_2: string | null) => Omit<import("../types/bindings").RpcFederation, "network"> & {
    meta: import("../types").ClientConfigMetadata;
    network: import("../types").Network;
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationClientConfig: ((state: CommonState) => RpcJsonClientConfig | null) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => RpcJsonClientConfig & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationStabilityPoolConfig: ((state: CommonState) => RpcStabilityPoolConfig | null) & import("reselect").OutputSelectorFields<(args_0: RpcJsonClientConfig | null) => RpcStabilityPoolConfig & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationFeeSchedule: ((state: CommonState) => import("../types/bindings").RpcFediFeeSchedule | null) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => import("../types/bindings").RpcFediFeeSchedule & {
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
export declare const selectFederationMetadata: ((state: CommonState) => Record<string, string> & import("../types").ClientConfigMetadata) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => Record<string, string> & import("../types").ClientConfigMetadata & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationBalance: ((state: CommonState) => MSats) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => number & {
    _: "MSats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsActiveFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectIsAnyFederationRecovering: ((state: CommonState) => boolean) & import("reselect").OutputSelectorFields<(args_0: Federation[]) => boolean & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationCustomFediMods: (s: CommonState) => FediMod[];
export declare const selectMaxStableBalanceSats: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: Record<string, string> & import("../types").ClientConfigMetadata) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxInvoiceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: Record<string, string> & import("../types").ClientConfigMetadata) => number & {
    _: "Sats";
} & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectMaxBalanceAmount: ((state: CommonState) => Sats) & import("reselect").OutputSelectorFields<(args_0: Record<string, string> & import("../types").ClientConfigMetadata) => number & {
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
export declare const selectFederationFediMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Federation | undefined, args_1: FediMod[]) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectFederationGroupChats: ((state: CommonState) => string[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, string> & import("../types").ClientConfigMetadata) => string[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
/**
 * Selects all federations that support a chat server and have
 * initialized chat state with an authenticatedMember
 */
export declare const selectFederationsWithChatConnections: ((state: CommonState) => Federation[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, {
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
} | undefined>, args_1: Federation[]) => Federation[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
