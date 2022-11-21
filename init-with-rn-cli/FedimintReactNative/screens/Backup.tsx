import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Button, View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import type { CameraDevice, VideoFile } from 'react-native-vision-camera'
import Share from 'react-native-share'

import type { RootStackParamList } from '../App'

export type Props = NativeStackScreenProps<RootStackParamList, 'Backup'>

const VideoRecorder = () => {
    const { t } = useTranslation()
    const [isRecording, setIsRecording] = useState(false)
    const [videoFile, setVideoFile] = useState<VideoFile>()
    const camera = useRef<Camera>(null)
    const devices = useCameraDevices()
    const device = devices.front

    if (devices.front === undefined) return null

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

    return (
        <>
            <View style={styles.cameraScannerContainer}>
                <Camera
                    style={styles.camera}
                    ref={camera}
                    device={device as CameraDevice}
                    isActive={true}
                    video={true}
                    // frameProcessor={frameProcessor}
                    // frameProcessorFps={5}
                />
            </View>
            {isRecording ? (
                <Button
                    title={t('feature.backup.stop-recording')}
                    onPress={stopRecording}
                />
            ) : (
                <Button
                    title={t('feature.backup.start-recording')}
                    onPress={startRecording}
                    color={'red'}
                />
            )}
            {videoFile && (
                <View>
                    <Text>{`${videoFile.duration} second video of size ${videoFile.size} saved to: ${videoFile.path}`}</Text>

                    <Button title={t('words.share')} onPress={shareVideo} />
                </View>
            )}
        </>
    )
}

const Backup: React.FC<Props> = ({ navigation }: Props) => {
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
            return <VideoRecorder />
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
    cameraScannerContainer: {
        height: '50%',
        width: '100%',
    },
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default Backup
