import React, { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import { Camera, CameraDevice } from 'react-native-vision-camera'
import { BarcodeFormat, useScanBarcodes } from 'vision-camera-code-scanner'
import { usePrevious } from '../../../state/hooks'

type QrCodeScanner = {
    device: CameraDevice
    onQrCodeDetected: Function
    millisecondsToThrottle: number
}

const QrCodeScanner = ({
    device,
    onQrCodeDetected,
    millisecondsToThrottle = 5000,
}: QrCodeScanner) => {
    const [detectedQrData, setDetectedQrData] = useState<string>('')
    const previousQrData = usePrevious(detectedQrData)
    const [frameProcessor, barcodes] = useScanBarcodes(
        [BarcodeFormat.QR_CODE],
        {
            checkInverted: true,
        },
    )

    useEffect(() => {
        barcodes.map(b => {
            setDetectedQrData(b.content?.data as string)
            // Only call the detection function if QR data is different
            // but retry after a few seconds... essentially a throttling function
            // in case some error occurs
            if (detectedQrData !== '' && detectedQrData !== previousQrData) {
                onQrCodeDetected(b.content?.data)
                setTimeout(() => setDetectedQrData(''), millisecondsToThrottle)
            }
        })
    }, [
        barcodes,
        detectedQrData,
        millisecondsToThrottle,
        onQrCodeDetected,
        previousQrData,
    ])

    return (
        <Camera
            style={styles.camera}
            device={device}
            isActive={true}
            frameProcessor={frameProcessor}
            frameProcessorFps={2}
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
