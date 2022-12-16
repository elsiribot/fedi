import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Text } from '@rneui/themed'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native'
import { useCameraDevices } from 'react-native-vision-camera'
import { useBridge } from '../contexts/FederationsContext'
import { RootStackParamList } from '../types/navigation'

import AnimatedQrCodeScanner from '../components/feature/scan/AnimatedQrCodeScanner'
import CameraPermissionsRequired from '../components/feature/scan/CameraPermissionsRequired'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveOffline'>

const ReceiveOffline: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const { validateEcash } = useBridge()
    const [validating, setValidating] = useState(false)
    const [showingError, setShowingError] = useState(false)
    const [percent, setPercent] = useState(0)

    const devices = useCameraDevices()
    const device = devices.back

    const renderQrCodeScanner = () => {
        if (device == null) {
            return <ActivityIndicator />
        } else {
            return (
                <AnimatedQrCodeScanner
                    device={device}
                    onProgress={(p: number) => setPercent(p)}
                    onQrCodeDetected={onResult}
                />
            )
        }
    }

    const onResult = async (ecash: string) => {
        // `!validating` so we don't call multiple times
        // `!showingError` so we don't stack error alerts
        if (!validating && !showingError) {
            setValidating(true)
            try {
                const { valid, amount } = await validateEcash(ecash)
                if (valid) {
                    navigation.navigate('ConfirmReceiveOffline', {
                        amount,
                        ecash,
                    })
                } else {
                    Alert.alert(t('words.error'), 'Invalid ecash tokens', [
                        {
                            text: t('words.done'),
                            onPress: () => setShowingError(false),
                        },
                    ])
                }
            } catch (e: any) {
                setShowingError(true)
                // this happens when the QR code doesn't contain valid tokens
                Alert.alert(t('words.error'), e.message, [
                    {
                        text: t('words.done'),
                        onPress: () => setShowingError(false),
                    },
                ])
            }
            setValidating(false)
        }
    }

    return (
        <CameraPermissionsRequired
            alternativeActionButton={null}
            message={t('feature.receive.camera-access-information')}
            nextScreen={'ReceiveOffline'}>
            <View style={styles.container}>
                <View style={styles.cameraScannerContainer}>
                    {renderQrCodeScanner()}
                </View>
                <Text>{percent}</Text>
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

export default ReceiveOffline
