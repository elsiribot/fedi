import { useRef, useState, useEffect } from 'react'
import { AppState } from 'react-native'

/**
 * Hook to track whether the app is in the foreground.
 * ref: https://reactnative.dev/docs/appstate.html#addeventlistener
 *
 * @returns true if app is running in the foreground
 * @returns false if user is in another app or on the home screen
 */
export const useAppIsInForeground = () => {
    const appState = useRef(AppState.currentState)
    const [isActive, setIsActive] = useState<boolean>(
        appState.current === 'active',
    )

    useEffect(() => {
        const subscription = AppState.addEventListener(
            'change',
            nextAppState => {
                if (appState.current === nextAppState) return
                setIsActive(nextAppState === 'active')
                appState.current = nextAppState
            },
        )
        return () => subscription.remove()
    }, [])

    // True if
    return isActive
}
