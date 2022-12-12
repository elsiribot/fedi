import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'

import type { RootStackParamList } from '../Router'
import BackupVideoRecorder from '../components/feature/backup/BackupVideoRecorder'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecordBackupVideo'
>

const RecordBackupVideo: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            // TODO: request permission & handle navigation to update permissions page
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess', {
                    nextScreen: 'RecordBackupVideo',
                })
            }
        }

        checkForPermissions()
    }, [navigation])

    const devices = useCameraDevices()
    const device = devices.front

    const renderVideoRecorder = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return <BackupVideoRecorder />
        }
    }

    return <View style={styles.container}>{renderVideoRecorder()}</View>
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
    },
})

export default RecordBackupVideo
