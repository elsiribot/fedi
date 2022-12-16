import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import type { RootStackParamList } from '../Router'
import BackupVideoRecorder from '../components/feature/backup/BackupVideoRecorder'
import { useTranslation } from 'react-i18next'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecordBackupVideo'
>

const RecordBackupVideo: React.FC<Props> = () => {
    const { t } = useTranslation()

    const devices = useCameraDevices()
    const device = devices.front

    return (
        <CameraPermissionsRequired
            alternativeActionButton={null}
            message={t('feature.backup.camera-access-information')}
            nextScreen={'RecordBackupVideo'}>
            <View style={styles.container}>
                {device === null ? (
                    <ActivityIndicator />
                ) : (
                    <BackupVideoRecorder />
                )}
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        padding: 24,
    },
})

export default RecordBackupVideo
