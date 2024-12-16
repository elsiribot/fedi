import { TFunction } from 'i18next'
import { useCallback, useMemo } from 'react'

import {
    closeToast as reduxCloseToast,
    showToast as reduxShowToast,
} from '@fedi/common/redux'
import { ToastArgs } from '@fedi/common/types'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useCommonDispatch } from './redux'

export function useToast() {
    const dispatch = useCommonDispatch()

    const show = useCallback(
        (toast: string | ToastArgs, timeout?: number) => {
            const args = typeof toast === 'string' ? { content: toast } : toast

            // Ensure a key is always set
            args.key = args.key || Math.random().toString(36).substring(2, 15)

            dispatch(reduxShowToast(args))

            // Auto-close if timeout is provided
            if (timeout && timeout > 0) {
                setTimeout(() => {
                    dispatch(reduxCloseToast(args.key))
                }, timeout)
            }
        },
        [dispatch],
    )

    const error = useCallback(
        (t: TFunction, err: unknown, defaultMsg = 'errors.unknown-error') => {
            show({
                content: formatErrorMessage(t, err, defaultMsg),
                status: 'error',
            })
        },
        [show],
    )

    const close = useCallback(
        (key?: string) => {
            dispatch(reduxCloseToast(key))
        },
        [dispatch],
    )

    return useMemo(() => {
        return { show, error, close }
    }, [show, error, close])
}
