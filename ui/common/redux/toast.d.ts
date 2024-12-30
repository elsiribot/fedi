import { PayloadAction } from '@reduxjs/toolkit';
import { CommonState } from '.';
import { Toast, ToastArgs } from '../types/toast';
/*** Initial State ***/
declare const initialState: {
    toast: Toast | null;
};
export type ToastState = typeof initialState;
/*** Slice definition ***/
export declare const toastSlice: import("@reduxjs/toolkit").Slice<{
    toast: Toast | null;
}, {
    setToast(state: import("immer/dist/internal").WritableDraft<{
        toast: Toast | null;
    }>, action: PayloadAction<Toast>): void;
    closeToast(state: import("immer/dist/internal").WritableDraft<{
        toast: Toast | null;
    }>, action: PayloadAction<string | undefined>): void;
}, "toast">;
/*** Basic actions ***/
export declare const setToast: import("@reduxjs/toolkit").ActionCreatorWithPayload<Required<ToastArgs>, "toast/setToast">, closeToast: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<string | undefined, "toast/closeToast">;
/*** Selectors ***/
export declare const selectToast: (s: CommonState) => Required<ToastArgs> | null;
/*** Async thunk actions ***/
export declare const showToast: import("@reduxjs/toolkit").AsyncThunk<void, ToastArgs, {
    state: CommonState;
    dispatch?: import("redux").Dispatch | undefined;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export {};
