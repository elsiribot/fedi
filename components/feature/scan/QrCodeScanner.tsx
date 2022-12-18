import React, { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { Camera, CameraDevice } from 'react-native-vision-camera'
import { BarcodeFormat, useScanBarcodes } from 'vision-camera-code-scanner'

type QrCodeScanner = {
    device: CameraDevice
    onQrCodeDetected: Function
}

const QrCodeScanner = ({ device, onQrCodeDetected }: QrCodeScanner) => {
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

const styles = StyleSheet.create({
    camera: {
        height: '100%',
        width: '100%',
    },
})

export default QrCodeScanner
