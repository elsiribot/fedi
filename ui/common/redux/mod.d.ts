import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { FediMod } from '../types';
export interface ModVisibility {
    isHidden: boolean;
}
declare const initialState: {
    customGlobalMods: Record<string, FediMod>;
    customGlobalModVisibility: Record<string, ModVisibility>;
    suggestedGlobalModVisibility: Record<string, ModVisibility>;
};
export type ModState = typeof initialState;
export declare const modSlice: import("@reduxjs/toolkit").Slice<{
    customGlobalMods: Record<string, FediMod>;
    customGlobalModVisibility: Record<string, ModVisibility>;
    suggestedGlobalModVisibility: Record<string, ModVisibility>;
}, {
    addCustomGlobalMod(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<string, FediMod>;
        customGlobalModVisibility: Record<string, ModVisibility>;
        suggestedGlobalModVisibility: Record<string, ModVisibility>;
    }>, action: {
        payload: {
            fediMod: FediMod;
        };
        type: string;
    }): void;
    removeCustomGlobalMod(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<string, FediMod>;
        customGlobalModVisibility: Record<string, ModVisibility>;
        suggestedGlobalModVisibility: Record<string, ModVisibility>;
    }>, action: {
        payload: {
            modId: FediMod['id'];
        };
        type: string;
    }): void;
    setCustomGlobalModVisibility(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<string, FediMod>;
        customGlobalModVisibility: Record<string, ModVisibility>;
        suggestedGlobalModVisibility: Record<string, ModVisibility>;
    }>, action: {
        payload: {
            modId: FediMod['id'];
            isHidden: boolean;
        };
        type: string;
    }): void;
    setSuggestedGlobalModVisibility(state: import("immer/dist/internal").WritableDraft<{
        customGlobalMods: Record<string, FediMod>;
        customGlobalModVisibility: Record<string, ModVisibility>;
        suggestedGlobalModVisibility: Record<string, ModVisibility>;
    }>, action: {
        payload: {
            modId: FediMod['id'];
            isHidden: boolean;
        };
        type: string;
    }): void;
}, "mod">;
export declare const addCustomGlobalMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    fediMod: FediMod;
}, "mod/addCustomGlobalMod">, removeCustomGlobalMod: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    modId: FediMod['id'];
}, "mod/removeCustomGlobalMod">, setCustomGlobalModVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    modId: FediMod['id'];
    isHidden: boolean;
}, "mod/setCustomGlobalModVisibility">, setSuggestedGlobalModVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    modId: FediMod['id'];
    isHidden: boolean;
}, "mod/setSuggestedGlobalModVisibility">;
export declare const selectGlobalCustomMods: (s: CommonState) => FediMod[];
export declare const selectGlobalSuggestedMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: import("../types").ClientConfigMetadata | undefined) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectVisibleSuggestedMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, ModVisibility>, args_1: FediMod[]) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectVisibleCustomMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: Record<string, ModVisibility>, args_1: FediMod[]) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export declare const selectAllVisibleMods: ((state: CommonState) => FediMod[]) & import("reselect").OutputSelectorFields<(args_0: FediMod[], args_1: FediMod[]) => FediMod[] & {
    clearCache: () => void;
}> & {
    clearCache: () => void;
};
export {};
