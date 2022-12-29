import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text, Theme, useTheme } from '@rneui/themed'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Dimensions, ImageBackground, StyleSheet, View } from 'react-native'

import { Images } from '../assets/images'
import HoloCard from '../components/ui/HoloCard'
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

    useEffect(() => {
        const startBackupFileUpload = async () => {
            try {
                await uploadBackupFile(videoFilePath)

                navigation.navigate('SocialBackupCloudUpload')
            } catch (error) {
                const typedError = error as Error
                console.error(typedError)
                toast?.show(typedError?.message, 3000)
            }
        }

        // TODO: Uncomment below and remove simulated timeout when bridge is ready
        // startBackupFileUpload()
        setTimeout(() => {
            startBackupFileUpload()
        }, 5000)
    }, [navigation, toast, uploadBackupFile, videoFilePath])

    return (
        <View style={styles(theme).container}>
            <View style={styles(theme).container}>
                <ImageBackground
                    source={Images.HoloBackground}
                    style={styles(theme).holoCircle}
                    imageStyle={styles(theme).circleBorder}>
                    <Text bold style={styles(theme).instructionsText}>
                        {'75%'}
                    </Text>
                </ImageBackground>
                <Text h2 h2Style={styles(theme).label}>
                    {t('feature.backup.creating-recovery-file')}
                </Text>

                <HoloCard
                    body={
                        <View>
                            <Text>
                                {t(
                                    'feature.backup.social-backup-processing-info-1',
                                )}
                            </Text>
                            <LineBreak />
                            <Text>
                                {t(
                                    'feature.backup.social-backup-processing-info-2',
                                )}
                            </Text>
                        </View>
                    }
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
            padding: theme.spacing.md,
        },
        label: {
            textAlign: 'center',
            marginVertical: theme.spacing.xl,
            paddingHorizontal: theme.spacing.xl,
        },
        instructionsText: {
            textAlign: 'center',
            paddingHorizontal: theme.spacing.xl,
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
    })

export default SocialBackupProcessing
