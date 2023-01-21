import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import Share from 'react-native-share'

import { Images } from '../assets/images'
import HoloCard from '../components/ui/HoloCard'
import LineBreak from '../components/ui/LineBreak'
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

    const renderCreateBackupButton = () => {
        if (backupsCompleted >= BACKUPS_REQUIRED) {
            return (
                <Button
                    title={t('feature.backup.create-another-backup')}
                    containerStyle={styles(theme).createBackupButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        } else if (backupsCompleted === 1) {
            return (
                <Button
                    title={t('feature.backup.create-second-backup')}
                    containerStyle={styles(theme).createBackupButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        } else {
            return (
                <Button
                    title={t('feature.backup.create-first-backup')}
                    containerStyle={styles(theme).createBackupButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        }
    }

    const renderBackupsMadeStatus = () => {
        if (backupsCompleted === BACKUPS_REQUIRED) {
            return <Text bold>{`(${t('words.complete')})`}</Text>
        } else {
            return (
                <Text bold>
                    {`(${BACKUPS_REQUIRED - backupsCompleted} ${t(
                        'words.required',
                    )})`}
                </Text>
            )
        }
    }

    const renderFirstBackupStatus = () => {
        if (backupsCompleted > 0) {
            return (
                <Text style={styles(theme).completed}>{`${t(
                    'words.complete',
                )}`}</Text>
            )
        } else {
            return <Text>{`${t('words.pending')}`}</Text>
        }
    }

    const renderSecondBackupStatus = () => {
        if (backupsCompleted > 1) {
            return (
                <Text style={styles(theme).completed}>{`${t(
                    'words.complete',
                )}`}</Text>
            )
        } else {
            return <Text>{`${t('words.pending')}`}</Text>
        }
    }

    return (
        <ScrollView contentContainerStyle={styles(theme).container}>
            <HoloCard
                iconImage={Images.FediFile}
                title={t('feature.backup.backup-social-recovery-file')}
                body={
                    <>
                        <View>
                            <Text>
                                {t(
                                    'feature.backup.backup-social-recovery-file-instructions',
                                )}
                            </Text>
                            <LineBreak />
                            <Text>
                                {t(
                                    'feature.backup.backup-social-recovery-file-instructions-1',
                                )}
                            </Text>
                            <LineBreak />
                            <Text>
                                {t(
                                    'feature.backup.backup-social-recovery-file-instructions-2',
                                )}
                            </Text>
                            <LineBreak />
                            <Text>
                                {t(
                                    'feature.backup.backup-social-recovery-file-instructions-3',
                                )}
                            </Text>
                            <LineBreak />
                        </View>
                        {renderCreateBackupButton()}
                    </>
                }
            />

            <View style={styles(theme).backupsContainer}>
                <View style={styles(theme).backupRow}>
                    <Text bold>
                        {t('feature.backup.backups-made')}
                        {'\n'}
                    </Text>
                    {renderBackupsMadeStatus()}
                </View>
                <View style={styles(theme).backupRow}>
                    <Text>
                        {`${t('words.backup')} ${t('words.one')}`}
                        {'\n'}
                    </Text>
                    {renderFirstBackupStatus()}
                </View>
                <View style={styles(theme).backupRow}>
                    <Text>{`${t('words.backup')} ${t('words.two')}`}</Text>
                    {renderSecondBackupStatus()}
                </View>
            </View>
            <Button
                title={t('feature.backup.complete-social-backup')}
                containerStyle={[
                    styles(theme).completeButton,
                    // FIXME: changed 2 to 1 as hack for faster dev
                    backupsCompleted < 1 ? styles(theme).hidden : {},
                ]}
                onPress={() => {
                    navigation.navigate('SocialBackupSuccess')
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
        backupsContainer: {
            width: '100%',
            marginVertical: theme.spacing.lg,
        },
        backupRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        completed: {
            color: theme.colors.success,
        },
        completeButton: {
            width: '100%',
            marginTop: theme.spacing.xl,
        },
        createBackupButton: {
            width: '100%',
        },
        hidden: {
            opacity: 0,
        },
    })

export default CompleteSocialBackup
