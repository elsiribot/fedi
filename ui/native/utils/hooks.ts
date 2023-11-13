import { useRoute } from '@react-navigation/native'
import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { Camera, CameraPermissionStatus } from 'react-native-vision-camera'

import { makeLog } from '@fedi/common/utils/log'

const log = makeLog('native/util/hooks')

/** Return whether or not we're in a screen that has the tabs navigator visible */
export function useHasBottomTabsNavigation() {
    const { name } = useRoute()
    return ['Home', 'Chat', 'OmniScanner'].includes(name)
}

export function useCameraPermission() {
    const [cameraPermission, setCameraPermission] =
        useState<CameraPermissionStatus>()

    useEffect(() => {
        // Fetch camera permission initially
        Camera.getCameraPermissionStatus()
            .then(status => {
                setCameraPermission(status)
            })
            .catch(err => {
                log.warn('useCameraPermission', err)
                setCameraPermission('not-determined')
            })
        // Re-fetch on state change, user could have updated while offscreen
        const listener = AppState.addEventListener('change', () => {
            Camera.getCameraPermissionStatus().then(status => {
                setCameraPermission(status)
            })
        })
        // Unsubscribe on unmount
        return () => listener.remove()
    }, [])

    const requestCameraPermission = useCallback(() => {
        return Camera.requestCameraPermission().then(status => {
            setCameraPermission(status)
        })
    }, [])

    return { cameraPermission, requestCameraPermission }
}
