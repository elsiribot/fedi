import { Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { VideoFile } from 'react-native-vision-camera'

import RecordVideo from './RecordVideo'
import ReviewVideo from './ReviewVideo'

const BackupVideoRecorder = () => {
    const { theme } = useTheme()
    const [videoFile, setVideoFile] = useState<VideoFile | null>(null)

    const saveVideo = async (video: VideoFile) => {
        console.log('saveVideo', video)
        setVideoFile(video)
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

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            width: '100%',
            paddingHorizontal: theme.spacing.md,
        },
    })

export default BackupVideoRecorder
