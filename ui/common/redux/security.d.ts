import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
export interface ProtectedFeatures {
    app: boolean;
    changePin: boolean;
    nostrSettings: boolean;
}
export type PinState = {
    protectedFeatures: ProtectedFeatures;
    unlockedFeatures: ProtectedFeatures;
    isBackingUpBeforePin: boolean;
};
/*** Slice definition ***/
export declare const securitySlice: import("@reduxjs/toolkit").Slice<PinState, {
    setFeatureUnlocked(state: import("immer/dist/internal").WritableDraft<PinState>, action: PayloadAction<{
        key: keyof ProtectedFeatures;
        unlocked: boolean;
    }>): void;
    setProtectedFeature(state: import("immer/dist/internal").WritableDraft<PinState>, action: PayloadAction<{
        key: keyof ProtectedFeatures;
        enabled: boolean;
    }>): void;
    setIsBackingUpBeforePin(state: import("immer/dist/internal").WritableDraft<PinState>, action: PayloadAction<boolean>): void;
}, "security">;
/*** Basic actions ***/
export declare const setIsBackingUpBeforePin: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "security/setIsBackingUpBeforePin">, setFeatureUnlocked: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    key: keyof ProtectedFeatures;
    unlocked: boolean;
}, "security/setFeatureUnlocked">, setProtectedFeature: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    key: keyof ProtectedFeatures;
    enabled: boolean;
}, "security/setProtectedFeature">;
/*** Selectors ***/
export declare const selectIsFeatureUnlocked: (s: CommonState, feature: keyof ProtectedFeatures) => boolean;
export declare const selectUnlockedFeatures: (s: CommonState) => ProtectedFeatures;
export declare const selectProtectedFeatures: (s: CommonState) => ProtectedFeatures;
export declare const selectIsRecoveringBeforePin: (s: CommonState) => boolean;
