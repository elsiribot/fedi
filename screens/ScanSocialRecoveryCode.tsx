import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanSocialRecoveryCode'
>

const ScanSocialRecoveryCode: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('socialrecovery:')) {
                console.info('fedi social recovery detected', input)
                const parts = input.split('::')
                const userPublicKey = parts[1]
                const videoUrl = parts[2]
                console.info(userPublicKey, videoUrl)

                navigation.navigate('CompleteRecoveryAssist', {
                    userPublicKey,
                    videoUrl,
                })
            } else {
                toast?.show(t('feature.recovery.invalid-qr-code'), 3000)
            }
        },
        [navigation, toast, t],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return (
                <QrCodeScanner
                    device={device}
                    onQrCodeDetected={(qrCodeData: string) => {
                        handleUserInput(qrCodeData)
                    }}
                />
            )
        }
    }

    return (
        <CameraPermissionsRequired
            alternativeActionButton={
                <Button
                    title={t(
                        'feature.recovery.paste-social-recovery-code-instead',
                    )}
                    onPress={checkClipboard}
                    type="clear"
                />
            }
            message={t('feature.recovery.camera-access-information')}>
            <View style={styles(theme).container}>
                <View style={styles(theme).cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Button
                    title={t('feature.recovery.paste-social-recovery-code')}
                    // TODO: Swap commented code when bridge is ready
                    // onPress={checkClipboard}
                    onPress={() =>
                        handleUserInput(
                            'socialrecovery::pubkey::http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                        )
                    }
                />
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cameraScannerContainer: {
            height: '80%',
            width: '100%',
            margin: theme.spacing.lg,
        },
    })

export default ScanSocialRecoveryCode
