import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import Share from 'react-native-share'

import HoloCard from '../components/ui/HoloCard'
import SvgImage from '../components/ui/SvgImage'
import {
    completeSocialBackup,
    useBackupRecoveryContext,
} from '../state/contexts/BackupRecoveryContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'CompleteSocialBackup'
>

const BACKUPS_REQUIRED = 2

const CompleteSocialBackup: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { locateRecoveryFile } = useBridge()
    const [backupsCompleted, setBackupsCompleted] = useState<number>(0)
    const { dispatch } = useBackupRecoveryContext()

    const createBackup = async () => {
        try {
            const recoveryFilePath = await locateRecoveryFile()
            const result = await Share.open({
                title: 'Your Fedi Backup File',
                // FIXME: this needs file:// prefix ... should do this with a util?
                url: `file://${recoveryFilePath}`,
            })
            console.log(result)
            setBackupsCompleted(
                Math.min(BACKUPS_REQUIRED, backupsCompleted + 1),
            )
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <HoloCard
                iconImage={<SvgImage name="FediFile" />}
                title={t('feature.backup.save-your-wallet-backup-file')}
                body={
                    <>
                        <View>
                            <Text>
                                {t(
                                    'feature.backup.save-your-wallet-backup-file-where',
                                )}
                            </Text>
                        </View>
                    </>
                }
            />
            {backupsCompleted > 0 && (
                <Button
                    fullWidth
                    type="clear"
                    title={t(
                        'feature.backup.save-your-wallet-backup-file-again',
                    )}
                    onPress={createBackup}
                />
            )}
            <Button
                title={
                    backupsCompleted === 0
                        ? t('feature.backup.save-file')
                        : t('words.complete')
                }
                containerStyle={styles(theme).completeButton}
                onPress={() => {
                    if (backupsCompleted === 0) {
                        createBackup()
                    } else {
                        dispatch(completeSocialBackup())
                        navigation.navigate('SocialBackupSuccess')
                    }
                }}
            />
        </ScrollView>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        completeButton: {
            width: '100%',
            marginTop: theme.spacing.xl,
        },
    })

export default CompleteSocialBackup
