import { Button, CheckBox, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, Pressable, Dimensions } from 'react-native'
import Video from 'react-native-video'
import type { VideoFile } from 'react-native-vision-camera'

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
        <View style={styles(theme).container}>
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
        </View>
    )
}

const CAMERA_SIZE = Dimensions.get('window').width * 0.9

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            width: '100%',
        },
        buttonsContainer: {
            marginTop: 'auto',
            alignItems: 'center',
            width: '100%',
        },
        confirmButton: {
            marginTop: theme.spacing.lg,
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
        recordingActive: {
            backgroundColor: theme.colors.red,
            borderColor: theme.colors.red,
        },
        recordingInactive: {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        video: {
            height: '100%',
            width: '100%',
        },
    })

export default ReviewVideo
