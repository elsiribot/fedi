import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Card, Image, Text, Theme, useTheme } from '@rneui/themed'
import React, { useState } from 'react'
import Share from 'react-native-share'
import { useTranslation } from 'react-i18next'
import { View, StyleSheet, ImageBackground, Dimensions } from 'react-native'

import { Images } from '../assets/images'

import type { RootStackParamList } from '../Router'
import { useBridge } from '../contexts/FederationsContext'

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
                    containerStyle={styles(theme).continueButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        } else if (backupsCompleted === 1) {
            return (
                <Button
                    title={t('feature.backup.create-second-backup')}
                    containerStyle={styles(theme).continueButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        } else {
            return (
                <Button
                    title={t('feature.backup.create-first-backup')}
                    containerStyle={styles(theme).continueButton}
                    onPress={() => {
                        createBackup()
                    }}
                />
            )
        }
    }

    const renderBackupsMadeStatus = () => {
        if (backupsCompleted === BACKUPS_REQUIRED) {
            return <Text h4>{`(${t('words.complete')})`}</Text>
        } else {
            return (
                <Text h4>
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
            <Card containerStyle={styles(theme).roundedCardContainer}>
                <ImageBackground
                    style={styles(theme).imageBackground}
                    source={Images.HoloBackground}>
                    <Image
                        source={Images.FediFile}
                        style={styles(theme).iconImage}
                    />
                    <Text h4>
                        {'\n'}
                        {t('feature.backup.backup-social-recovery-file')}
                    </Text>
                    <Text>
                        {'\n'}
                        {t(
                            'feature.backup.backup-social-recovery-file-instructions',
                        )}
                        {'\n'}
                    </Text>
                    <Text>
                        {t(
                            'feature.backup.backup-social-recovery-file-instructions-1',
                        )}
                        {'\n'}
                    </Text>
                    <Text>
                        {t(
                            'feature.backup.backup-social-recovery-file-instructions-2',
                        )}
                        {'\n'}
                    </Text>
                    <Text>
                        {t(
                            'feature.backup.backup-social-recovery-file-instructions-3',
                        )}
                    </Text>
                    {renderCreateBackupButton()}
                </ImageBackground>
            </Card>

            <View style={styles(theme).backupsContainer}>
                <View style={styles(theme).backupRow}>
                    <Text h4>
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
            padding: 24,
        },
        label: {
            textAlign: 'center',
            marginVertical: 16,
        },
        hidden: {
            opacity: 0,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: 24,
            fontWeight: '400',
        },
        backupsContainer: {
            width: '100%',
            marginVertical: 16,
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
        continueButton: {
            width: '100%',
            marginVertical: 16,
        },
        roundedCardContainer: {
            borderRadius: 16,
            width: '100%',
            marginHorizontal: 0,
            padding: 0,
        },
        imageBackground: {
            paddingHorizontal: 16,
            alignItems: 'center',
        },
        iconImage: {
            marginTop: 16,
            height: theme.sizes.sm,
            width: theme.sizes.sm,
        },
    })

export default CompleteSocialBackup
