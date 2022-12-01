import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Camera } from 'react-native-vision-camera'

import type { RootStackParamList } from '../Router'
import BackupVideoRecorder from '../components/feature/backup/BackupVideoRecorder'

export type Props = NativeStackScreenProps<RootStackParamList, 'Backup'>

const Backup: React.FC<Props> = () => {
    const { t } = useTranslation()
    const [hasCameraPermission, setHasCameraPermission] = React.useState(false)

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            // TODO: request permission & handle navigation to update permissions page
            const status = await Camera.getCameraPermissionStatus()
            console.log('cameraPermissionStatus: ', status)
            setHasCameraPermission(status === 'authorized')

            await Camera.requestCameraPermission()
        }

        checkForPermissions()
    }, [])

    const renderVideoRecorder = () => {
        if (hasCameraPermission === false) {
            return <ActivityIndicator />
        } else {
            return <BackupVideoRecorder />
        }
    }

    return (
        <View style={styles.container}>
            <Text>{t('feature.backup.record-video')}</Text>
            {renderVideoRecorder()}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
})

export default Backup
