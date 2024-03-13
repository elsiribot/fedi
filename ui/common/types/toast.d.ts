export interface ToastArgs {
    content: string;
    key?: string;
    duration?: number;
}
export type Toast = Required<ToastArgs>;
