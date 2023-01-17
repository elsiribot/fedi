import { Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import type { CameraDevice, VideoFile } from 'react-native-vision-camera'
import { Camera, useCameraDevices } from 'react-native-vision-camera'

import dateUtils from '../../../utils/DateUtils'

type RecordVideoProps = {
    saveVideo: (video: VideoFile) => {}
}

const RecordVideo = ({ saveVideo }: RecordVideoProps) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [isRecording, setIsRecording] = useState(false)
    const camera = useRef<Camera>(null)
    const devices = useCameraDevices()
    const device = devices.front

    if (devices.front === undefined) return null

    const startRecording = async () => {
        setIsRecording(true)
        camera.current?.startRecording({
            onRecordingFinished: saveVideo,
            onRecordingError: error => {
                console.log(error)
            },
            // FIXME: will this always be available?
            fileType: 'mp4',
        })
    }

    const stopRecording = async () => {
        setIsRecording(false)
        camera.current?.stopRecording()
    }

    const todaysDate = dateUtils.formatTimestamp(
        Date.now() / 1000,
        'MMMM dd, yyyy',
    )

    return (
        <View style={styles(theme).container}>
            <View
                style={[
                    styles(theme).cameraContainer,
                    isRecording
                        ? styles(theme).recordingActive
                        : styles(theme).recordingInactive,
                ]}>
                <Camera
                    style={styles(theme).camera}
                    ref={camera}
                    device={device as CameraDevice}
                    isActive={true}
                    video={true}
                    audio={true}
                />
            </View>
            <Text
                h2
                h2Style={[
                    styles(theme).instructionsText,
                    isRecording ? { color: theme.colors.primaryVeryLight } : {},
                ]}>
                {t('feature.backup.hold-record-button')}
            </Text>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <Text medium>
                    {t('feature.backup.social-backup-video-prompt', {
                        date: todaysDate,
                    })}
                </Text>
            </Card>
            <Pressable
                style={[
                    styles(theme).recordButton,
                    isRecording
                        ? styles(theme).recordingActive
                        : styles(theme).recordingInactive,
                ]}
                onPressOut={stopRecording}
                onPressIn={startRecording}>
                <View style={styles(theme).innerRecordButton} />
            </Pressable>
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: theme.spacing.md,
        },
        cameraContainer: {
            height: theme.sizes.socialBackupCameraHeight,
            width: theme.sizes.socialBackupCameraWidth,
            borderWidth: 3,
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        instructionsText: {
            textAlign: 'center',
            marginTop: theme.spacing.xl,
        },
        playIconContainer: {
            position: 'absolute',
            justifyContent: 'center',
            alignItems: 'center',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
        },
        recordButton: {
            textAlign: 'center',
            height: theme.sizes.recordButtonOuter,
            width: theme.sizes.recordButtonOuter,
            borderRadius: theme.sizes.recordButtonOuter / 2,
            marginTop: 'auto',
        },
        recordingActive: {
            backgroundColor: theme.colors.red,
            borderColor: theme.colors.red,
        },
        recordingInactive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        innerRecordButton: {
            alignItems: 'center',
            top:
                (theme.sizes.recordButtonOuter -
                    theme.sizes.recordButtonInner) /
                2,
            left:
                (theme.sizes.recordButtonOuter -
                    theme.sizes.recordButtonInner) /
                2,
            height: theme.sizes.recordButtonInner,
            width: theme.sizes.recordButtonInner,
            borderRadius: theme.sizes.recordButtonInner / 2,
            borderWidth: 3,
            borderColor: theme.colors.secondary,
        },
        roundedCardContainer: {
            borderRadius: theme.borders.defaultRadius,
            width: '100%',
            marginHorizontal: 0,
        },
    })

export default RecordVideo
