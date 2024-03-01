export interface ToastArgs {
    content: string
    key?: string
    duration?: number
    status?: ToastStatus
}

export type ToastStatus = 'success' | 'error' | 'info'

export type Toast = Required<ToastArgs>
