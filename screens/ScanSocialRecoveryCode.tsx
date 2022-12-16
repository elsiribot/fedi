import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { Button } from '@rneui/themed'

import type { RootStackParamList } from '../types/navigation'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanSocialRecoveryCode'
>

const ScanSocialRecoveryCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()

    const handleUserInput = useCallback(
        async (input: string) => {
            if (input.startsWith('socialrecovery:')) {
                console.log('fedi social recovery detected', input)
                const parts = input.split(':')
                const pubkey = parts[1]
                const videoUrl = parts[2]
                console.log(pubkey, videoUrl)

                navigation.navigate('RecoveryAssistConfirmation')
            } else {
                // TODO: display invalid social recovery error toast
            }
        },
        [navigation],
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
            message={t('feature.recovery.camera-access-information')}
            nextScreen={'ScanSocialRecoveryCode'}>
            <View style={styles.container}>
                <View style={styles.cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Button
                    title={t('feature.recovery.paste-social-recovery-code')}
                    onPress={checkClipboard}
                />
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraScannerContainer: {
        height: '80%',
        width: '100%',
        margin: 16,
    },
})

export default ScanSocialRecoveryCode
