import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'
import { VideoFile } from 'react-native-vision-camera'
import Share from 'react-native-share'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialBackupCloudUpload'
>

const SocialBackupCloudUpload: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const [videoFile, setVideoFile] = useState<VideoFile | null>(null)

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
            <View style={styles(theme).container}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).holoCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Image
                        source={Images.WordList}
                        style={styles(theme).holoIconImage}
                    />
                </ImageBackground>
                <Text h3 h3Style={styles(theme).label}>
                    {t('feature.backup.cloud-backup')}
                </Text>
                <Text h4 h4Style={styles(theme).instructionsText}>
                    {t('feature.backup.cloud-backup-instructions')}
                </Text>
            </View>

            <View style={styles(theme).buttonsContainer}>
                <Button
                    title={t('words.skip')}
                    onPress={() => {
                        // shareVideo()
                    }}
                    type="clear"
                />
                <Button
                    title={t('feature.backup.backup-to-google-drive')}
                    containerStyle={styles(theme).continueButton}
                    onPress={() => {
                        navigation.navigate('RecordBackupVideo')
                        // navigation.navigate('RecordBackupVideo')
                    }}
                />
            </View>
        </View>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CIRCLE_SIZE = WINDOW_WIDTH * 0.45

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
        },
        label: {
            textAlign: 'center',
            marginVertical: 16,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: 24,
            fontWeight: '400',
        },
        holoCircle: {
            height: CIRCLE_SIZE,
            width: CIRCLE_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
        },
        circleBorder: {
            borderRadius: CIRCLE_SIZE * 0.5,
        },
        holoIconImage: {
            height: theme.sizes.lg,
            width: theme.sizes.lg,
        },
        buttonsContainer: {
            marginTop: 'auto',
            alignItems: 'center',
            width: '100%',
        },
        continueButton: {
            width: '100%',
            marginVertical: 16,
        },
    })

export default SocialBackupCloudUpload
