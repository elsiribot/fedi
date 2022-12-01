import { Button, Text } from '@rneui/themed'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import Share from 'react-native-share'
import type { CameraDevice, VideoFile } from 'react-native-vision-camera'

const BackupVideoRecorder = () => {
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
            <View style={styles.container}>
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
                    <Text>{`${videoFile.duration} second video saved to: ${videoFile.path}`}</Text>

                    <Button title={t('words.share')} onPress={shareVideo} />
                </View>
            )}
        </>
    )
}

const styles = StyleSheet.create({
    container: {
        height: '50%',
        width: '100%',
    },
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default BackupVideoRecorder
