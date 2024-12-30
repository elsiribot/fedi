/**
 * @file
 * Redux state for the (N)ew (U)ser e(X)perience
 */
import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
/*** Initial State ***/
declare const initialState: {
    steps: {
        hasViewedMemberQr: boolean;
        hasOpenedNewChat: boolean;
        hasPerformedPersonalBackup: boolean;
        hasOpenedStabilityPool: boolean;
    };
};
export type NuxState = typeof initialState;
/*** Slice definition ***/
export declare const nuxSlice: import("@reduxjs/toolkit").Slice<{
    steps: {
        hasViewedMemberQr: boolean;
        hasOpenedNewChat: boolean;
        hasPerformedPersonalBackup: boolean;
        hasOpenedStabilityPool: boolean;
    };
}, {
    completeNuxStep(state: import("immer/dist/internal").WritableDraft<{
        steps: {
            hasViewedMemberQr: boolean;
            hasOpenedNewChat: boolean;
            hasPerformedPersonalBackup: boolean;
            hasOpenedStabilityPool: boolean;
        };
    }>, action: PayloadAction<keyof NuxState["steps"]>): void;
    resetNuxSteps(state: import("immer/dist/internal").WritableDraft<{
        steps: {
            hasViewedMemberQr: boolean;
            hasOpenedNewChat: boolean;
            hasPerformedPersonalBackup: boolean;
            hasOpenedStabilityPool: boolean;
        };
    }>): void;
}, "nux">;
/*** Basic actions ***/
export declare const completeNuxStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<"hasViewedMemberQr" | "hasOpenedNewChat" | "hasPerformedPersonalBackup" | "hasOpenedStabilityPool", "nux/completeNuxStep">, resetNuxSteps: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"nux/resetNuxSteps">;
/*** Selectors ***/
export declare const selectNuxStep: (s: CommonState, step: keyof NuxState["steps"]) => boolean;
export {};
