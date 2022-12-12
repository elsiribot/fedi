import { useNavigation } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Button, Text } from '@rneui/themed'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native'
import { Camera, useCameraDevices } from 'react-native-vision-camera'
import { useBridge } from '../../../contexts/FederationsContext'
import { RootStackParamList } from '../../../Router'

import AnimatedQrCodeScanner from '../scan/AnimatedQrCodeScanner'

export type Props = NativeStackScreenProps<RootStackParamList, 'ReceiveOffline'>

const ReceiveOffline: React.FC<Props> = () => {
    const { validateEcash } = useBridge()
    const navigation = useNavigation()
    const [validating, setValidating] = useState(false)
    const [showingError, setShowingError] = useState(false)
    const [percent, setPercent] = useState(0)

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            const status = await Camera.getCameraPermissionStatus()
            console.log('checkForPermissions: ', status)
            if (status === 'denied') {
                navigation.navigate('RequestCameraAccess', {
                    nextScreen: 'Send',
                })
            }
        }

        checkForPermissions()
    }, [navigation])

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
        console.log('onResult', ecash)
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
                    // TODO: translate
                    Alert.alert('Error', 'Invalid ecash tokens', [
                        {
                            text: 'OK',
                            onPress: () => setShowingError(false),
                        },
                    ])
                }
            } catch (e: any) {
                setShowingError(true)
                // this happens when the QR code doesn't contain valid tokens
                // TODO: translate
                Alert.alert('Error', e.message, [
                    {
                        text: 'OK',
                        onPress: () => setShowingError(false),
                    },
                ])
            }
            setValidating(false)
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.cameraScannerContainer}>
                {renderQrCodeScanner()}
            </View>
            <Text>{percent}</Text>
            <Button title={'foobar'} onPress={() => {}} />
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

export default ReceiveOffline
