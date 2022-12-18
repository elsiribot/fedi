import { Card, Text, Theme, useTheme } from '@rneui/themed'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Pressable, Dimensions } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import type { CameraDevice, VideoFile } from 'react-native-vision-camera'

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
                />
            </View>
            <Text
                h3
                h3Style={[
                    styles(theme).instructionsText,
                    isRecording ? { color: theme.colors.primaryVeryLight } : {},
                ]}>
                {t('feature.backup.hold-record-button')}
            </Text>
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <Text>
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

const CAMERA_SIZE = Dimensions.get('window').width * 0.9
const RECORD_CIRCLE_OUTER_SIZE = 68
const RECORD_CIRCLE_INNER_SIZE = 56

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            width: '100%',
        },
        cameraContainer: {
            height: CAMERA_SIZE,
            width: CAMERA_SIZE,
            borderWidth: 3,
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        instructionsText: {
            textAlign: 'center',
            marginTop: theme.spacing.lg,
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
            height: RECORD_CIRCLE_OUTER_SIZE,
            width: RECORD_CIRCLE_OUTER_SIZE,
            borderRadius: RECORD_CIRCLE_OUTER_SIZE / 2,
            marginVertical: theme.sizes.lg,
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
            top: (RECORD_CIRCLE_OUTER_SIZE - RECORD_CIRCLE_INNER_SIZE) / 2,
            left: (RECORD_CIRCLE_OUTER_SIZE - RECORD_CIRCLE_INNER_SIZE) / 2,
            height: RECORD_CIRCLE_INNER_SIZE,
            width: RECORD_CIRCLE_INNER_SIZE,
            borderRadius: RECORD_CIRCLE_INNER_SIZE / 2,
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
