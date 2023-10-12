import { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback } from 'react'
import { Camera } from 'react-native-vision-camera'

import { PermissionScreen } from '../components/ui/PermissionScreen'
import { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CameraPermission'
>
const CameraPermission: React.FC<Props> = () => {
    const checkPermission = useCallback(() => {
        return Camera.getCameraPermissionStatus()
            .then(perm => perm === 'authorized')
            .catch(err => {
                console.warn('getCameraPermissionStatus error', err)
                return false
            })
    }, [])

    const requestPermission = useCallback(() => {
        return Camera.requestCameraPermission()
            .then(perm => perm === 'authorized')
            .catch(err => {
                console.warn('requestCameraPermission error', err)
                return false
            })
    }, [])

    return (
        <PermissionScreen
            icon="Scan"
            title="Allow camera access to:"
            descriptionIcons={['Qr', 'Chat', 'Wallet']}
            descriptionText="Scan QR codes, chat usernames, send money, and more"
            checkPermission={checkPermission}
            requestPermission={requestPermission}
        />
    )
}

export default CameraPermission
