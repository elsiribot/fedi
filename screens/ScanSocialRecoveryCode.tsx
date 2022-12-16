import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { Button } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanSocialRecoveryCode'
>

const ScanSocialRecoveryCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [permissionGranted, setPermissionGranted] = useState<boolean>(false)

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

    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.replace('RequestCameraAccess', {
                    alternativeActionButton: (
                        <Button
                            title={t(
                                'feature.recovery.paste-social-recovery-code-instead',
                            )}
                            onPress={checkClipboard}
                            type="clear"
                        />
                    ),
                    message: t('feature.recovery.camera-access-information'),
                    nextScreen: 'ScanSocialRecoveryCode',
                })
            }
            if (status === 'authorized') {
                setPermissionGranted(true)
            }
        }

        checkForPermissions()
    }, [checkClipboard, navigation, t])

    const devices = useCameraDevices()
    const device = devices.back

    if (permissionGranted === false) return null

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
        <View style={styles.container}>
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Button
                title={t('feature.recovery.paste-social-recovery-code')}
                onPress={checkClipboard}
            />
        </View>
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
