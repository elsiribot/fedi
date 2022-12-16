import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { Button } from '@rneui/themed'

import type { RootStackParamList } from '../Router'
import QrCodeScanner from '../components/feature/scan/QrCodeScanner'
import {
    changeSelectedFederation,
    updateConnectedFederations,
    useFederationsContext,
} from '../contexts/FederationsContext'
import { joinFederation, listFederations } from '../bridge'

export type Props = NativeStackScreenProps<
    RootStackParamList,
    'ScanSocialRecoveryCode'
>

const ScanSocialRecoveryCode: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { state, dispatch } = useFederationsContext()

    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess', {
                    nextScreen: 'ScanSocialRecoveryCode',
                })
            }
        }

        checkForPermissions()
    }, [navigation])

    async function handleUserInput(input: string) {
        if (input.startsWith('socialrecovery:')) {
            console.log('fedi social recovery detected', input)
            const parts = input.split(':')
            const pubkey = parts[1]
            const videoUrl = parts[2]

            navigation.navigate('RecoveryAssistConfirmation')
        } else {
            // TODO: display invalid social recovery error toast
        }
    }

    const checkClipboard = async () => {
        const text = await Clipboard.getString()
        handleUserInput(text)
    }

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
