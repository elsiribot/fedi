import React, { useEffect, useState } from 'react'
import { Camera } from 'react-native-vision-camera'
import RequestCameraAccess, {
    RequestCameraAccessProps,
} from './RequestCameraAccess'

interface Props extends RequestCameraAccessProps {
    children: React.ReactNode
    onPermissionGranted?: () => void | null
}

const CameraPermissionsRequired: React.FC<Props> = ({
    alternativeActionButton,
    message,
    onPermissionGranted,
    children,
}: Props) => {
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false)

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.debug('checkForPermissions: ', status)
            if (status === 'authorized') {
                setPermissionGranted(true)
            }
        }

        checkForPermissions()
    }, [])

    if (permissionGranted === false)
        return (
            <RequestCameraAccess
                alternativeActionButton={alternativeActionButton}
                message={message}
                onAccessGranted={() => {
                    setPermissionGranted(true)
                    onPermissionGranted && onPermissionGranted()
                }}
            />
        )

    return <>{children}</>
}

export default CameraPermissionsRequired
