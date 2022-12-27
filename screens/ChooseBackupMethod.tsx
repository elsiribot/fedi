import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import HoloCard from '../components/ui/HoloCard'
import LineBreak from '../components/ui/LineBreak'
// import { useBridge } from '../contexts/FederationsContext'

import type { RootStackParamList } from '../types/navigation'

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
            <Text style={styles(theme).instructionsText}>
                {t('feature.backup.choose-method-instructions')}
            </Text>
            <HoloCard
                iconImage={Images.SocialPeople}
                title={t('feature.backup.social-backup')}
                body={
                    <>
                        <Text style={styles(theme).backupMethodInstructions}>
                            {t('feature.backup.social-backup-instructions')}
                        </Text>
                        <Button
                            title={t('feature.backup.start-social-backup')}
                            containerStyle={styles(theme).backupMethodButton}
                            onPress={handleStartSocialBackup}
                        />
                    </>
                }
            />
            <LineBreak />
            <HoloCard
                iconImage={Images.Note}
                title={t('feature.backup.personal-backup')}
                body={
                    <>
                        <Text style={styles(theme).backupMethodInstructions}>
                            {t('feature.backup.personal-backup-instructions')}
                        </Text>
                        <Button
                            title={t('feature.backup.start-personal-backup')}
                            containerStyle={styles(theme).backupMethodButton}
                            onPress={() => {
                                navigation.navigate('StartPersonalBackup')
                            }}
                        />
                    </>
                }
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: theme.spacing.xl,
        },
        backupMethodButton: {
            width: '100%',
            marginTop: theme.spacing.md,
        },
        backupMethodInstructions: {
            textAlign: 'center',
            fontWeight: '400',
            paddingVertical: theme.spacing.xs,
        },
        instructionsText: {
            textAlign: 'center',
            marginBottom: theme.spacing.xl,
            paddingHorizontal: theme.spacing.md,
            fontWeight: '400',
        },
    })

export default ChooseBackupMethod
