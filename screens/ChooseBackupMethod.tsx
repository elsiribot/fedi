import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Image, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

import { Images } from '../assets/images'
// import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ChooseBackupMethod'
>

const ChooseBackupMethod: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    // TODO: Uncomment when bridge function is ready
    // const { locateRecoveryFile } = useBridge()
    //
    // const checkForExistingSocialBackup = async (): Promise<boolean> => {
    //     try {
    //         await locateRecoveryFile()
    //         return true
    //     } catch (error) {
    //         return false
    //     }
    // }

    const handleStartSocialBackup = async () => {
        // TODO: Uncomment when bridge function is ready
        // const backupFound = await checkForExistingSocialBackup()
        const backupFound = false

        if (backupFound) {
            navigation.navigate('SocialBackupCloudUpload')
        } else {
            navigation.navigate('StartSocialBackup')
        }
    }

    return (
        <View style={styles(theme).container}>
            <Text h4 h4Style={styles(theme).instructionsText}>
                {t('feature.backup.choose-method-instructions')}
            </Text>
            <ImageBackground
                source={Images.HoloBackground}
                style={styles(theme).backupMethodContainer}
                imageStyle={styles(theme).imageBackgroundBorder}>
                <Image
                    source={Images.SocialPeople}
                    style={styles(theme).iconImage}
                />
                <Text h4 h4Style={styles(theme).backupMethodLabel}>
                    {t('feature.backup.social-backup')}
                </Text>
                <Text h4 h4Style={styles(theme).backupMethodInstructions}>
                    {t('feature.backup.social-backup-instructions')}
                </Text>
                <Button
                    title={t('feature.backup.start-social-backup')}
                    containerStyle={styles(theme).backupMethodButton}
                    onPress={handleStartSocialBackup}
                />
            </ImageBackground>
            <ImageBackground
                source={Images.HoloBackground}
                style={styles(theme).backupMethodContainer}
                imageStyle={styles(theme).imageBackgroundBorder}>
                <Image source={Images.Note} style={styles(theme).iconImage} />
                <Text h4 h4Style={styles(theme).backupMethodLabel}>
                    {t('feature.backup.personal-backup')}
                </Text>
                <Text h4 h4Style={styles(theme).backupMethodInstructions}>
                    {t('feature.backup.personal-backup-instructions')}
                </Text>
                <Button
                    title={t('feature.backup.start-personal-backup')}
                    containerStyle={styles(theme).backupMethodButton}
                    onPress={() => {
                        navigation.navigate('StartPersonalBackup')
                    }}
                />
            </ImageBackground>
        </View>
    )
}

const WINDOW_WIDTH = Dimensions.get('window').width
const CARD_WIDTH = WINDOW_WIDTH * 0.85

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: 24,
        },
        backupMethodContainer: {
            width: CARD_WIDTH,
            alignItems: 'center',
            padding: 24,
            marginVertical: 24,
            justifyContent: 'space-between',
        },
        backupMethodLabel: {
            paddingTop: 16,
        },
        backupMethodInstructions: {
            textAlign: 'center',
            fontWeight: '400',
            paddingTop: 16,
        },
        backupMethodButton: {
            width: '100%',
            marginTop: 16,
        },
        imageBackgroundBorder: {
            borderRadius: 12,
        },
        iconImage: {
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: 24,
            fontWeight: '400',
        },
    })

export default ChooseBackupMethod
