import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Theme, useTheme } from '@rneui/themed'
import { useCameraDevices } from 'react-native-vision-camera'

import type { RootStackParamList } from '../types/navigation'
import BackupVideoRecorder from '../components/feature/backup/BackupVideoRecorder'
import { useTranslation } from 'react-i18next'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'RecordBackupVideo'
>

const RecordBackupVideo: React.FC<Props> = () => {
    const { theme } = useTheme()
    const { t } = useTranslation()

    const devices = useCameraDevices()
    const device = devices.front

    return (
        <CameraPermissionsRequired
            requireMicrophone
            alternativeActionButton={null}
            message={t('feature.backup.camera-access-information')}>
            <View style={styles(theme).container}>
                {device === null ? (
                    <ActivityIndicator />
                ) : (
                    <BackupVideoRecorder />
                )}
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            padding: theme.spacing.xl,
        },
    })

export default RecordBackupVideo
