import { useCallback } from 'react'

import {
    showToast as reduxShowToast,
    closeToast as reduxCloseToast,
} from '@fedi/common/redux'
import { ToastArgs } from '@fedi/common/types'

import { useAppDispatch } from './store'

export function useToast() {
    const dispatch = useAppDispatch()

    const showToast = useCallback(
        (toast: ToastArgs) => {
            dispatch(reduxShowToast(toast))
        },
        [dispatch],
    )

    const closeToast = useCallback(
        (key?: string) => {
            dispatch(reduxCloseToast(key))
        },
        [dispatch],
    )

    return { showToast, closeToast }
}
