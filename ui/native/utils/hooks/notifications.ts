import notifee, { InitialNotification } from '@notifee/react-native'
import { useRef, useState, useEffect, useCallback } from 'react'
import { AppState } from 'react-native'

import { RootStackParamList } from '../../types/navigation'
import { NOTIFICATION_TYPES, handleInitialNotification } from '../notifications'

/**
 * Hook to track whether the app is in the foreground.
 * ref: https://reactnative.dev/docs/appstate.html#addeventlistener
 *
 * @returns true if app is running in the foreground
 * @returns false if user is in another app or on the home screen
 */
export const useIsForeground = () => {
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

export const useHandleInitialNotification = () => {
    const [loading, setLoading] = useState(true)
    const [initialNotificationData, setInitialNotificationData] =
        useState<string>()

    useEffect(() => {
        const onLoad = async () => {
            try {
                // Clear notification count (ios)
                await notifee.setBadgeCount(0)

                // Checks if app was opened by notification
                const notification = await notifee.getInitialNotification()
                if (!notification) return

                const data = notification?.notification.data
                if (!data) return

                if (
                    data.type === NOTIFICATION_TYPES.chat &&
                    data.room_id &&
                    typeof data.room_id === 'string'
                ) {
                    // Handle chat notifications
                    setInitialNotificationData(data.room_id)
                } else if (data.type === NOTIFICATION_TYPES.payment) {
                    // Handle payment notifications
                    console.error('PAYMENT NOTIFICATIONASDFLKSDF')
                }
            } catch (e) {
                console.error('Failed to handle initial notification', e)
            } finally {
                setLoading(false)
            }
        }
        onLoad()
    }, [])
    return { loadingNotification: loading, initialNotificationData }
}
