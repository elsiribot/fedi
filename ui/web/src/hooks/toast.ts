import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import {
    showToast as reduxShowToast,
    closeToast as reduxCloseToast,
} from '@fedi/common/redux'
import { ToastArgs } from '@fedi/common/types'
import { formatErrorMessage } from '@fedi/common/utils/format'

import { useAppDispatch } from './store'

export function useToast() {
    const { t } = useTranslation()
    const dispatch = useAppDispatch()

    const showToast = useCallback(
        (toast: string | ToastArgs) => {
            const args = typeof toast === 'string' ? { content: toast } : toast
            dispatch(reduxShowToast(args))
        },
        [dispatch],
    )

    const showErrorToast = useCallback(
        (err: unknown, defaultMsg: string) => {
            showToast({ content: formatErrorMessage(t, err, defaultMsg) })
        },
        [t, showToast],
    )

    const closeToast = useCallback(
        (key?: string) => {
            dispatch(reduxCloseToast(key))
        },
        [dispatch],
    )

    return { showToast, showErrorToast, closeToast }
}
