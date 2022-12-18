import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import Share from 'react-native-share'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet } from 'react-native'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../types/navigation'
import { useBridge } from '../contexts/FederationsContext'
import HoloCard from '../components/ui/HoloCard'
import LineBreak from '../components/ui/LineBreak'

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
                url: recoveryFilePath,
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
        <View style={styles(theme).container}>
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
                    backupsCompleted < 2 ? styles(theme).hidden : {},
                ]}
                onPress={() => {
                    navigation.navigate('SocialBackupSuccess')
                }}
            />
        </View>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        backupsContainer: {
            width: '100%',
            marginVertical: theme.spacing.md,
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
            marginTop: 'auto',
        },
        createBackupButton: {
            width: '100%',
        },
        hidden: {
            opacity: 0,
        },
    })

export default CompleteSocialBackup
