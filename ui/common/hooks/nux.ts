/**
 * @file
 * Hooks for the (N)ew (U)ser e(X)perience
 */
import { useCallback } from 'react'

import { NuxState, completeNuxStep, selectNuxStep } from '../redux/nux'
import { useCommonDispatch, useCommonSelector } from './redux'

export function useNuxStep(step: keyof NuxState['steps']) {
    const dispatch = useCommonDispatch()
    const stepState = useCommonSelector(s => selectNuxStep(s, step))

    const completeStep = useCallback(() => {
        dispatch(completeNuxStep(step))
    }, [dispatch, step])

    return [stepState, completeStep]
}
