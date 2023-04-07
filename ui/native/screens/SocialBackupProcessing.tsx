import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { BridgeEventEmitter, RecoveryFileCreationEvent } from '../bridge'
import HoloCard from '../components/ui/HoloCard'
import HoloProgressCircle from '../components/ui/HoloProgressCircle'
import LineBreak from '../components/ui/LineBreak'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'SocialBackupProcessing'
>

const SocialBackupProcessing: React.FC<Props> = ({
    navigation,
    route,
}: Props) => {
    const { t } = useTranslation()
    const { theme } = useTheme()
    const { uploadBackupFile } = useBridge()
    const { toast } = useEnvironmentContext().state
    const { videoFilePath } = route.params
    const [percentComplete, setPercentComplete] = useState<number>(0)
    const [uploadStarted, setUploadStarted] = useState(false)

    // Registers an event handler listening for recovery file creation events
    useEffect(() => {
        const emitter = new BridgeEventEmitter()
        const listener = emitter.onRecoveryFileCreation(
            (event: RecoveryFileCreationEvent) => {
                console.info(event)
                if (event.type === 'progress') {
                    setPercentComplete(event.percentComplete)
                } else if (event.type === 'complete') {
                    navigation.replace('SocialBackupCloudUpload')
                } else if (event.type === 'failed') {
                    // TODO: Implement localized errors
                    // getError(event.errorCode)
                    toast?.show('Recovery file creation failed', 3000)
                }
            },
        )

        return () => listener.remove()
    }, [navigation, toast])

    useEffect(() => {
        // FIXME: this is broken until the backend allows us to re-upload
        const startBackupFileUpload = async () => {
            setUploadStarted(true)
            try {
                await uploadBackupFile(videoFilePath)
            } catch (error) {
                const typedError = error as Error
                console.error(typedError)
                toast?.show(typedError?.message, 3000)
            }
        }

        // Only upload backup file once
        if (!uploadStarted) {
            startBackupFileUpload()
        }
    }, [
        navigation,
        toast,
        uploadBackupFile,
        videoFilePath,
        uploadStarted,
        setUploadStarted,
    ])

    // TODO: Remove this simulation when bridge is emitting events
    useEffect(() => {
        if (percentComplete === 100) {
            // TODO: navigate to SocialBackupCloudUpload when it's implemented
            navigation.replace('CompleteSocialBackup')
        }
        const interval = setInterval(() => {
            setPercentComplete(percentComplete + 1)
        }, 50)

        return () => clearInterval(interval)
    }, [navigation, percentComplete])

    return (
        <View style={styles(theme).container}>
            <HoloProgressCircle percentComplete={percentComplete} />
            <Text h2 h2Style={styles(theme).label}>
                {t('feature.backup.creating-recovery-file')}
            </Text>

            <HoloCard
                body={
                    <View>
                        <Text caption>
                            {t(
                                'feature.backup.social-backup-processing-info-1',
                            )}
                        </Text>
                        <LineBreak />
                        <Text caption>
                            {t(
                                'feature.backup.social-backup-processing-info-2',
                            )}
                        </Text>
                    </View>
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
            justifyContent: 'center',
            padding: theme.spacing.xl,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.xl,
        },
    })

export default SocialBackupProcessing
