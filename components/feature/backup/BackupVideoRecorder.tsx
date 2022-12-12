import {
    Button,
    Card,
    CheckBox,
    Icon,
    Text,
    Theme,
    useTheme,
} from '@rneui/themed'
import React, { createRef, ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Pressable, Dimensions } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import Video from 'react-native-video'
import Share from 'react-native-share'
import type { CameraDevice, VideoFile } from 'react-native-vision-camera'

import DateUtils from '../../../utils/DateUtils'
import { useNavigation } from '@react-navigation/native'

type ReviewVideoProps = {
    videoFile: VideoFile
    onRecordAgain: () => void
}

const ReviewVideo = ({ videoFile, onRecordAgain }: ReviewVideoProps) => {
    const { t } = useTranslation()
    const navigation = useNavigation()
    const { theme } = useTheme()
    const [isPaused, setIsPaused] = useState(true)
    const [confirmFaceChecked, setFaceConfirmChecked] = useState(false)
    const [confirmVoiceChecked, setConfirmVoiceChecked] = useState(false)

    console.log('videoFile', videoFile)

    return (
        <>
            <View
                style={[
                    styles(theme).cameraContainer,
                    styles(theme).recordingInactive,
                ]}>
                <Video
                    source={{ uri: videoFile?.path }} // Can be a URL or a local file.
                    style={styles(theme).video}
                    paused={isPaused}
                    onError={error => {
                        console.error(error)
                    }}
                    onEnd={() => setIsPaused(true)}
                />
                {isPaused && (
                    <Pressable
                        style={styles(theme).playIconContainer}
                        onPress={() => setIsPaused(false)}>
                        <Icon
                            name="play"
                            type="font-awesome"
                            color={theme.colors.white}
                            size={theme.sizes.lg}
                        />
                    </Pressable>
                )}
            </View>

            <Text h3 h3Style={styles(theme).instructionsText}>
                {t('feature.backup.please-review-backup-video')}
            </Text>
            <CheckBox
                center
                title={t('feature.backup.review-face-confirmation')}
                checked={confirmFaceChecked}
                onPress={() => setFaceConfirmChecked(!confirmFaceChecked)}
            />
            <CheckBox
                center
                title={t('feature.backup.review-voice-confirmation')}
                checked={confirmVoiceChecked}
                onPress={() => setConfirmVoiceChecked(!confirmVoiceChecked)}
            />

            <View style={styles(theme).buttonsContainer}>
                <Button
                    title={t('feature.backup.record-again')}
                    onPress={onRecordAgain}
                    type="clear"
                />

                <Button
                    title={t('feature.backup.confirm-backup-video')}
                    onPress={() => {
                        navigation.navigate('SocialBackupProcessing')
                    }}
                    disabled={!confirmFaceChecked || !confirmVoiceChecked}
                    containerStyle={styles(theme).confirmButton}
                />
            </View>
        </>
    )
}

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

    const todaysDate = DateUtils.formatTimestamp(
        Date.now() / 1000,
        'MMMM dd, yyyy',
    )

    return (
        <>
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
        </>
    )
}

const BackupVideoRecorder = () => {
    const { t } = useTranslation()
    // const videoRef = createRef<
    const { theme } = useTheme()
    const [videoFile, setVideoFile] = useState<VideoFile | null>(null)

    const saveVideo = async (video: VideoFile) => {
        console.log('saveVideo', video)
        setVideoFile(video)
    }

    const shareVideo = async () => {
        if (!videoFile?.path) return

        try {
            const result = await Share.open({
                url: videoFile.path,
            })
            console.log(result)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <View style={styles(theme).container}>
            {videoFile ? (
                <ReviewVideo
                    videoFile={videoFile}
                    onRecordAgain={() => setVideoFile(null)}
                />
            ) : (
                <RecordVideo saveVideo={saveVideo} />
            )}
        </View>
    )
}

const CAMERA_SIZE = Dimensions.get('window').width * 0.9
const RECORD_CIRCLE_OUTER_SIZE = 68
const RECORD_CIRCLE_INNER_SIZE = 56

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            padding: 12,
            width: '100%',
        },
        buttonsContainer: {
            marginTop: 'auto',
            alignItems: 'center',
            width: '100%',
        },
        confirmButton: {
            marginTop: 12,
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
            marginTop: 12,
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
        playIcon: {
            // top: 0,
            // bottom: 0,
            // left: 0,
            // right: 0,
        },
        recordButton: {
            textAlign: 'center',
            height: RECORD_CIRCLE_OUTER_SIZE,
            width: RECORD_CIRCLE_OUTER_SIZE,
            borderRadius: RECORD_CIRCLE_OUTER_SIZE / 2,
            marginVertical: 48,
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
            borderRadius: 16,
            width: '100%',
            marginHorizontal: 0,
        },
        video: {
            height: '100%',
            width: '100%',
        },
    })

export default BackupVideoRecorder
