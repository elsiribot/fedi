import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Theme, useTheme } from '@rneui/themed'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'

import type { SocialRecoveryQrCode } from '@fedi/common/types'

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
    const [downloading, setDownloading] = useState<boolean>(false)

    const handleUserInput = useCallback(
        async (input: string) => {
            if (downloading) return
            try {
                let qr: SocialRecoveryQrCode = JSON.parse(input)
                try {
                    setDownloading(true)
                    // FIXME: this is getting called over-and-over
                    let videoPath = await socialRecoveryDownloadVerificationDoc(
                        qr.recoveryId,
                    )
                    if (videoPath == null) {
                        toast?.show(
                            t('feature.recovery.nothing-to-download'),
                            3000,
                        )
                    } else {
                        navigation.navigate('CompleteRecoveryAssist', {
                            videoPath: videoPath as string,
                            recoveryId: qr.recoveryId,
                        })
                    }
                } catch (e) {
                    console.error("couldn't download video", e)
                    toast?.show(t('feature.recovery.download-failed'), 3000)
                }
            } catch (e) {
                // FIXME: this isn't quite right error message. It's more like "valid JSON, perhaps not valid recovery QR"
                toast?.show(t('feature.recovery.invalid-qr-code'), 3000)
            }
            console.debug(input)
            setDownloading(false)
        },
        [
            downloading,
            navigation,
            toast,
            t,
            socialRecoveryDownloadVerificationDoc,
        ],
    )

    const checkClipboard = useCallback(async () => {
        const text = await Clipboard.getString()
        handleUserInput(text.trim())
    }, [handleUserInput])

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (downloading || device == null) {
            return (
                <View style={styles(theme).activityIndicator}>
                    <ActivityIndicator />
                </View>
            )
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
                {/* <Button
                    title={t('feature.recovery.paste-social-recovery-code')}
                    // TODO: Swap commented code when bridge is ready
                    // onPress={checkClipboard}
                    onPress={() =>
                        handleUserInput(
                            'socialrecovery::pubkey::http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                        )
                    }
                /> */}
            </View>
        </CameraPermissionsRequired>
    )
}

const styles = (theme: Theme) =>
    StyleSheet.create({
        activityIndicator: {
            marginVertical: 'auto',
        },
        container: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cameraScannerContainer: {
            height: '100%',
            width: '100%',
            margin: theme.spacing.lg,
        },
    })

export default ScanSocialRecoveryCode
