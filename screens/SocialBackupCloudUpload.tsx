import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import Share from 'react-native-share'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../types/navigation'
import { useBridge } from '../contexts/FederationsContext'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialBackupCloudUpload'
>

const SocialBackupCloudUpload: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { locateRecoveryFile } = useBridge()

    const shareVideo = async () => {
        try {
            const recoveryFilePath = await locateRecoveryFile()
            const result = await Share.open({
                url: recoveryFilePath,
            })
            console.log(result)
            navigation.navigate('CompleteSocialBackup')
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
                <Text h2 h2Style={styles(theme).label}>
                    {t('feature.backup.cloud-backup')}
                </Text>
                <Text style={styles(theme).instructionsText}>
                    {t('feature.backup.cloud-backup-instructions')}
                </Text>
            </View>

            <View style={styles(theme).buttonsContainer}>
                <Button
                    title={t('words.skip')}
                    type="clear"
                    onPress={() => {
                        navigation.navigate('CompleteSocialBackup')
                    }}
                />
                <Button
                    title={t('feature.backup.backup-to-google-drive')}
                    containerStyle={styles(theme).continueButton}
                    onPress={() => {
                        shareVideo()
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
            padding: theme.spacing.xl,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.lg,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
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
            marginVertical: theme.spacing.md,
        },
    })

export default SocialBackupCloudUpload
