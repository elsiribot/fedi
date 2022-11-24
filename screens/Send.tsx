import Clipboard from '@react-native-clipboard/clipboard'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import {
    Camera,
    CameraDevice,
    useCameraDevices,
} from 'react-native-vision-camera'
import { BarcodeFormat, useScanBarcodes } from 'vision-camera-code-scanner'
import { Button, Text } from '@rneui/themed'

import type { RootStackParamList } from '../Router'

export type Props = NativeStackScreenProps<RootStackParamList, 'Send'>

type CameraScannerProps = {
    device: CameraDevice
    onQrCodeDetected: Function
}

const CameraScanner = ({ device, onQrCodeDetected }: CameraScannerProps) => {
    const [frameProcessor, barcodes] = useScanBarcodes(
        [BarcodeFormat.QR_CODE],
        {
            checkInverted: true,
        },
    )

    useEffect(() => {
        barcodes.map(b => {
            onQrCodeDetected(b.content?.data)
        })
    }, [barcodes, onQrCodeDetected])

    return (
        <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={5}
        />
    )
}

const Send: React.FC<Props> = ({ navigation }: Props) => {
    const { t } = useTranslation()
    const [hasCameraPermission, setHasCameraPermission] = React.useState(false)
    const [invoice, setInvoice] = React.useState('')
    const [address, setAddress] = React.useState('')

    // first check if user has granted camera permissions
    useEffect(() => {
        const checkForPermissions = async () => {
            // TODO: request permission & handle navigation to update permissions page
            console.log(Camera)

            const status = await Camera.getCameraPermissionStatus()
            console.log('cameraPermissionStatus: ', status)
            setHasCameraPermission(status === 'authorized')

            await Camera.requestCameraPermission()
        }

        checkForPermissions()
    }, [])

    // side effect to detect if invoice has been pasted or scanned
    useEffect(() => {
        if (invoice.length > 0) {
            // TODO: go to send confirm screen before calling payInvoice
            navigation.navigate('ConfirmSend', {
                invoice,
            })
        }
        if (address.length > 0) {
            // TODO: go to send confirm screen before calling payInvoice
            navigation.navigate('ConfirmSendOnChain', {
                address,
            })
        }
    }, [invoice, address, navigation])

    function handleUserInput(input: string) {
        if (input.startsWith('lnbc')) {
            console.log('sending ln')
            setInvoice(input)
        } else if (input.startsWith('bcrt')) {
            console.log('sending btc')
            setAddress(input)
        } else {
            console.log('no invoice detected')
        }
    }

    const checkClipboard = async () => {
        // call fedimint-ffi here
        const text = await Clipboard.getString()
        handleUserInput(text)
    }

    const devices = useCameraDevices()
    const device = devices.back

    const renderCameraScanner = () => {
        if (device == null || hasCameraPermission === false) {
            return <ActivityIndicator />
        } else {
            return (
                <CameraScanner
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
            <Text>{t('feature.send.scan-qr-code')}</Text>
            <View style={styles.cameraScannerContainer}>
                {renderCameraScanner()}
            </View>
            <Button
                title={t('feature.send.paste-lightning-request')}
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
        height: '50%',
        width: '100%',
    },
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default Send
