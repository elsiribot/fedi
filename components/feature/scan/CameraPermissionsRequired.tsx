import { useNavigation } from '@react-navigation/native'
import React, { useEffect, useState } from 'react'
import { Camera } from 'react-native-vision-camera'
import {
    NavigationHook,
    RequestCameraAccessParams,
} from '../../../types/navigation'

interface Props extends RequestCameraAccessParams {
    children: React.ReactNode
}

const CameraPermissionsRequired: React.FC<Props> = ({
    alternativeActionButton,
    message,
    nextScreen,
    children,
}: Props) => {
    const navigation = useNavigation<NavigationHook>()
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false)

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.replace('RequestCameraAccess', {
                    alternativeActionButton,
                    message,
                    nextScreen,
                })
            }
            if (status === 'authorized') {
                setPermissionGranted(true)
            }
        }

        checkForPermissions()
    }, [alternativeActionButton, message, nextScreen, navigation])

    if (permissionGranted === false) return null

    return <>{children}</>
}

export default CameraPermissionsRequired
