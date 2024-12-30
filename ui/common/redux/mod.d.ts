import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { FediMod } from '../types';
export interface ModVisibility {
    isHiddenCommunity?: boolean;
    isHidden: boolean;
    isGlobal?: boolean;
    isCommunity?: boolean;
    isCustom?: boolean;
    federationId?: string | null;
}
declare const initialState: {
    customGlobalMods: Record<FediMod["id"], FediMod>;
    modVisibility: Record<FediMod["id"], ModVisibility>;
};
export type ModState = typeof initialState;
export declare const modSlice: import("@reduxjs/toolkit").Slice<{
    customGlobalMods: Record<FediMod["id"], FediMod>;
    modVisibility: Record<FediMod["id"], ModVisibility>;
}, {
    addCustomMod(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<FediMod["id"], FediMod>;
        modVisibility: Record<FediMod["id"], ModVisibility>;
    }>, action: PayloadAction<{
        fediMod: FediMod;
    }>): void;
    removeCustomMod(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<FediMod["id"], FediMod>;
        modVisibility: Record<FediMod["id"], ModVisibility>;
    }>, action: PayloadAction<{
        modId: FediMod["id"];
    }>): void;
    setModVisibility(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<FediMod["id"], FediMod>;
        modVisibility: Record<FediMod["id"], ModVisibility>;
    }>, action: PayloadAction<{
        modId: FediMod["id"];
        isHidden?: boolean;
        isHiddenCommunity?: boolean;
        federationId?: string;
    }>): void;
}, "mod">;
export declare const addCustomMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    fediMod: FediMod;
}, "mod/addCustomMod">, removeCustomMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    modId: FediMod["id"];
}, "mod/removeCustomMod">, setModVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    modId: FediMod["id"];
    isHidden?: boolean;
    isHiddenCommunity?: boolean;
    federationId?: string;
}, "mod/setModVisibility">;
export declare const selectCustomMods: (s: CommonState) => FediMod[];
export declare const selectCommunityMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, FediMod[] | undefined>) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectGlobalMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: {
    [x: string]: string | undefined;
} | undefined) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectVisibleGlobalMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, ModVisibility>, args_1: FediMod[]) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectVisibleCustomMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, ModVisibility>, args_1: FediMod[]) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectVisibleCommunityMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: string | null, args_1: Record<string, FediMod[] | undefined>, args_2: Record<string, ModVisibility>) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectModsVisibility: (s: CommonState) => Record<string, ModVisibility>;
export declare const selectModVisibility: (s: CommonState, id: string) => ModVisibility;
export declare const selectConfigurableMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: FediMod[], args_1: FediMod[]) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAllVisibleMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: FediMod[], args_1: FediMod[]) => FediMod[], {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
