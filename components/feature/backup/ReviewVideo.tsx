import { useNavigation } from '@react-navigation/native'
import { Button, CheckBox, Icon, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, StyleSheet, View } from 'react-native'
import Video from 'react-native-video'
import type { VideoFile } from 'react-native-vision-camera'

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
            <View style={styles(theme).cameraContainer}>
                <Video
                    source={{ uri: videoFile?.path }} // Can be a URL or a local file.
                    style={styles(theme).video}
                    paused={isPaused}
                    ignoreSilentSwitch={'ignore'}
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

            <Text h2 h2Style={styles(theme).instructionsText}>
                {t('feature.backup.please-review-backup-video')}
            </Text>
            <View style={styles(theme).confirmationContainer}>
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {t('feature.backup.review-face-confirmation')}
                        </Text>
                    }
                    checked={confirmFaceChecked}
                    onPress={() => setFaceConfirmChecked(!confirmFaceChecked)}
                />
                <CheckBox
                    title={
                        <Text style={styles(theme).checkboxText}>
                            {t('feature.backup.review-voice-confirmation')}
                        </Text>
                    }
                    checked={confirmVoiceChecked}
                    onPress={() => setConfirmVoiceChecked(!confirmVoiceChecked)}
                />
            </View>

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

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'space-evenly',
            width: '100%',
        },
        buttonsContainer: {
            marginTop: 'auto',
            alignItems: 'center',
            width: '100%',
        },
        confirmButton: {
            marginTop: theme.spacing.md,
            width: '100%',
        },
        cameraContainer: {
            height: theme.sizes.socialBackupCameraHeight,
            width: theme.sizes.socialBackupCameraWidth,
            borderWidth: 3,
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
        },
        camera: {
            height: '100%',
            width: '100%',
        },
        confirmationContainer: {
            flex: 1,
            alignItems: 'flex-start',
            paddingHorizontal: 0,
            marginHorizontal: 0,
        },
        checkboxText: {
            paddingHorizontal: theme.spacing.md,
            textAlign: 'left',
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
        video: {
            height: '100%',
            width: '100%',
        },
    })

export default ReviewVideo
