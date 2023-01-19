import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { SocialRecoveryQrCode } from '../bridge'

import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import { useEnvironmentContext } from '../state/contexts/EnvironmentContext'
import { useBridge } from '../state/hooks'
import type { RootStackParamList } from '../types/navigation'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanSocialRecoveryCode'
>

const ScanSocialRecoveryCode: React.FC<Props> = ({ navigation }: Props) => {
    const { theme } = useTheme()
    const { socialRecoveryDownloadVerificationDoc } = useBridge()
    const { t } = useTranslation()
    const { toast } = useEnvironmentContext().state

    const handleUserInput = useCallback(
        async (input: string) => {
            // if (input.startsWith('socialrecovery:')) {
            //     console.info('fedi social recovery detected', input)
            //     const parts = input.split('::')
            //     const userPublicKey = parts[1]
            //     const videoUrl = parts[2]
            //     console.info(userPublicKey, videoUrl)

            //     navigation.navigate('CompleteRecoveryAssist', {
            //         userPublicKey,
            //         videoUrl,
            //     })
            // } else {
            //     toast?.show(t('feature.recovery.invalid-qr-code'), 3000)
            // }
            try {
                console.log('parsin', input)
                let qr: SocialRecoveryQrCode = JSON.parse(input)
                console.log('parsed')
                try {
                    console.log('downloading')
                    let videoPath = await socialRecoveryDownloadVerificationDoc(
                        qr.recoveryId,
                    )
                    console.log('downloaded', videoPath)
                    if (videoPath == null) {
                        // FIXME: internationalize
                        toast?.show('nothing to download frmo guardian', 3000)
                    } else {
                        console.log('todo: navigtate')
                        navigation.navigate('CompleteRecoveryAssist', {
                            videoPath: videoPath as string,
                        })
                    }
                } catch (e) {
                    console.log("couldn't download video", e)
                    // FIXME: internationalize
                    toast?.show('failed to download from guardian', 3000)
                }
            } catch (e) {
                // FIXME: this isn't quite right error message. It's more like "valid qr, couldn't download"
                toast?.show(t('feature.recovery.invalid-qr-code'), 3000)
            }
            console.log(input)
        },
        [navigation, toast, t, socialRecoveryDownloadVerificationDoc],
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
                        // FIXME: only 1 request at-a-time
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
